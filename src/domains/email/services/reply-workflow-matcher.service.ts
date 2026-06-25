import { Inject, Injectable } from '@nestjs/common';
import {
  OUTGOING_MESSAGE_REPOSITORY,
  OutgoingMessageRepository,
} from '../repository/message.repository';
import { OutgoingMessageRow } from '../../../lib/persistence';

/**
 * Reply threading (task-05 / decision-log 2026-06-25):
 * Match inbound `inReplyTo` to `outgoing_messages.provider_message_id` from initial send.
 * Fallback: exact `threadId` match when provider stores thread id as provider_message_id.
 */
@Injectable()
export class ReplyWorkflowMatcherService {
  constructor(
    @Inject(OUTGOING_MESSAGE_REPOSITORY)
    private readonly outgoingMessageRepository: OutgoingMessageRepository,
  ) {}

  async matchOutgoingMessage(input: {
    inReplyTo: string | null;
    threadId: string;
  }): Promise<OutgoingMessageRow | null> {
    if (input.inReplyTo) {
      const byReply =
        await this.outgoingMessageRepository.findByProviderMessageId(
          input.inReplyTo,
        );
      if (byReply) {
        return byReply;
      }
    }

    return this.outgoingMessageRepository.findByProviderMessageId(
      input.threadId,
    );
  }
}
