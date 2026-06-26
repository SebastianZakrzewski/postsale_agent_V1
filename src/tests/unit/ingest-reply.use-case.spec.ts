import { Test, TestingModule } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { EscalateUnmatchedReplyUseCase } from '../../domains/email/use-cases/escalate-unmatched-reply.use-case';
import { IngestReplyUseCase } from '../../domains/email/use-cases/ingest-reply.use-case';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  OUTGOING_MESSAGE_REPOSITORY,
} from '../../domains/email/repository/message.repository';
import { ReplyWorkflowMatcherService } from '../../domains/email/services/reply-workflow-matcher.service';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { gatedEscalationTestProviders } from '../helpers/gated-escalation-test.providers';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { MessageDirection, WorkflowStatus } from '../../lib/enums';
import { InMemoryCustomerMessageRepository } from '../helpers/in-memory-customer-message.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryMessageAttachmentRepository } from '../helpers/in-memory-message-attachment.repository';
import { InMemoryMessageLinkRepository } from '../helpers/in-memory-message-link.repository';
import { InMemoryOutgoingMessageRepository } from '../helpers/in-memory-outgoing-message.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

describe('IngestReplyUseCase', () => {
  let useCase: IngestReplyUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let outgoingRepository: InMemoryOutgoingMessageRepository;
  let customerMessageRepository: InMemoryCustomerMessageRepository;
  let attachmentRepository: InMemoryMessageAttachmentRepository;
  let linkRepository: InMemoryMessageLinkRepository;
  let idempotencyRepository: InMemoryIdempotencyRepository;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    outgoingRepository = new InMemoryOutgoingMessageRepository();
    customerMessageRepository = new InMemoryCustomerMessageRepository();
    attachmentRepository = new InMemoryMessageAttachmentRepository();
    linkRepository = new InMemoryMessageLinkRepository();
    idempotencyRepository = new InMemoryIdempotencyRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        IngestReplyUseCase,
        ReplyWorkflowMatcherService,
        GetWorkflowContextUseCase,
        EscalateWorkflowUseCase,
        ...gatedEscalationTestProviders,
        EscalateUnmatchedReplyUseCase,
        IdempotencyService,
        CheckIdempotencyUseCase,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: idempotencyRepository,
        },
        {
          provide: EmitWorkflowEventUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
        {
          provide: OUTGOING_MESSAGE_REPOSITORY,
          useValue: outgoingRepository,
        },
        {
          provide: CUSTOMER_MESSAGE_REPOSITORY,
          useValue: customerMessageRepository,
        },
        {
          provide: MESSAGE_ATTACHMENT_REPOSITORY,
          useValue: attachmentRepository,
        },
        {
          provide: MESSAGE_LINK_REPOSITORY,
          useValue: linkRepository,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(IngestReplyUseCase);
  });

  it('baseline case 6: unmatched reply escalates without persisting message', async () => {
    const escalateSpy = jest.spyOn(
      EscalateUnmatchedReplyUseCase.prototype,
      'execute',
    );

    const outcome = await useCase.execute({
      messageId: 'unknown-msg',
      threadId: 'unknown-thread',
      inReplyTo: 'missing-provider-id',
      fromEmail: 'customer@example.com',
      fromName: null,
      toEmails: ['sales@evapremium.com'],
      subject: 'Re: test',
      bodyText: 'reply',
      bodyHtml: null,
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [],
    });

    expect(outcome.type).toBe('escalated_unmatched');
    if (outcome.type === 'escalated_unmatched') {
      expect(outcome.reason).toBe('no_workflow_match');
      expect(outcome.isDuplicate).toBe(false);
    }
    expect(customerMessageRepository.all()).toHaveLength(0);
    expect(escalateSpy).toHaveBeenCalledTimes(1);

    const retry = await useCase.execute({
      messageId: 'unknown-msg',
      threadId: 'unknown-thread',
      inReplyTo: 'missing-provider-id',
      fromEmail: 'customer@example.com',
      fromName: null,
      toEmails: ['sales@evapremium.com'],
      subject: 'Re: test',
      bodyText: 'reply',
      bodyHtml: null,
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [],
    });

    expect(retry.type).toBe('escalated_unmatched');
    if (retry.type === 'escalated_unmatched') {
      expect(retry.isDuplicate).toBe(true);
    }
    expect(escalateSpy).toHaveBeenCalledTimes(1);
  });

  it('ingests reply with attachments and links in separate tables', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });

    await outgoingRepository.create({
      workflow_id: workflow.id,
      customer_message_id: null,
      to_address: 'customer@example.com',
      subject: 'Initial',
      body: 'Please reply',
      provider_message_id: 'provider-msg-1',
    });

    const outcome = await useCase.execute({
      messageId: 'gmail-reply-1',
      threadId: 'thread-1',
      inReplyTo: 'provider-msg-1',
      fromEmail: 'customer@example.com',
      fromName: null,
      toEmails: ['sales@evapremium.com'],
      subject: 'Re: Initial',
      bodyText: 'See https://example.com/photo',
      bodyHtml: null,
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [
        {
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
          contentRef: 'ref-photo',
        },
      ],
    });

    expect(outcome.type).toBe('ingested');
    expect(customerMessageRepository.all()).toHaveLength(1);
    expect(customerMessageRepository.all()[0]?.direction).toBe(
      MessageDirection.INBOUND,
    );
    expect(attachmentRepository.all()).toHaveLength(1);
    expect(linkRepository.all()).toHaveLength(1);
  });

  it('duplicate ingest by external_message_id returns already_ingested', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-dup',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });

    await outgoingRepository.create({
      workflow_id: workflow.id,
      customer_message_id: null,
      to_address: 'customer@example.com',
      subject: 'Initial',
      body: 'Please reply',
      provider_message_id: 'provider-dup',
    });

    const command = {
      messageId: 'gmail-reply-dup',
      threadId: 'thread-dup',
      inReplyTo: 'provider-dup',
      fromEmail: 'customer@example.com',
      fromName: null,
      toEmails: ['sales@evapremium.com'],
      subject: 'Re: Initial',
      bodyText: 'duplicate test',
      bodyHtml: null,
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [],
    };

    const first = await useCase.execute(command);
    const second = await useCase.execute(command);

    expect(first.type).toBe('ingested');
    expect(second.type).toBe('already_ingested');
    expect(customerMessageRepository.all()).toHaveLength(1);
    expect(attachmentRepository.all()).toHaveLength(0);
  });

  it('completes ingest on retry when idempotency key exists but message was not persisted', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-retry',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });

    await outgoingRepository.create({
      workflow_id: workflow.id,
      customer_message_id: null,
      to_address: 'customer@example.com',
      subject: 'Initial',
      body: 'Please reply',
      provider_message_id: 'provider-retry',
    });

    const command = {
      messageId: 'gmail-reply-retry',
      threadId: 'thread-retry',
      inReplyTo: 'provider-retry',
      fromEmail: 'customer@example.com',
      fromName: null,
      toEmails: ['sales@evapremium.com'],
      subject: 'Re: Initial',
      bodyText: 'retry after partial failure',
      bodyHtml: null,
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [],
    };

    await idempotencyRepository.tryInsert(
      `${command.messageId}:ingest_reply`,
      'ingest_reply',
    );

    const outcome = await useCase.execute(command);

    expect(outcome.type).toBe('ingested');
    expect(customerMessageRepository.all()).toHaveLength(1);
  });
});
