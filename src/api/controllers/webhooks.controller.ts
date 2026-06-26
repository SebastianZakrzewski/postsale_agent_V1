import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IngestReplyUseCase } from '../../domains/email/use-cases/ingest-reply.use-case';
import { mapInboundEmailDtoToCommand } from '../../domains/email/parsers/inbound-email.mapper';
import { parseN8nInboundEmailDto } from '../../domains/email/parsers/inbound-email.parser';
import { AnalyzeReplyUseCase } from '../../domains/requirements/use-cases/analyze-reply.use-case';
import { DuplicateStartWorkflowInProgressError } from '../../domains/postsale-workflows/errors/start-workflow.errors';
import { ProcessFollowupCheckUseCase } from '../../domains/postsale-workflows/use-cases/process-followup-check.use-case';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import {
  FollowupCheckWebhookDto,
  IngestEmailWebhookDto,
  StartWorkflowWebhookDto,
} from '../dto/webhook.dto';
import { mapStartWorkflowResultToWebhookResponse } from '../mappers/start-workflow-response.mapper';
import { parseStartWorkflowDto } from '../parsers/start-workflow.parser';
import { WebhookAuthGuard } from '../guards/webhook-auth.guard';

@Controller('webhooks')
@UseGuards(WebhookAuthGuard)
export class WebhooksController {
  constructor(
    private readonly startWorkflowUseCase: StartWorkflowUseCase,
    private readonly ingestReplyUseCase: IngestReplyUseCase,
    private readonly analyzeReplyUseCase: AnalyzeReplyUseCase,
    private readonly processFollowupCheckUseCase: ProcessFollowupCheckUseCase,
  ) {}

  @Post('workflow/start')
  @HttpCode(HttpStatus.OK)
  async startWorkflow(@Body() body: StartWorkflowWebhookDto) {
    let command;
    try {
      command = parseStartWorkflowDto(body);
    } catch {
      throw new BadRequestException('Invalid start workflow payload');
    }

    try {
      const result = await this.startWorkflowUseCase.execute(command);
      return mapStartWorkflowResultToWebhookResponse(result);
    } catch (error) {
      if (error instanceof DuplicateStartWorkflowInProgressError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post('email/inbound')
  @HttpCode(HttpStatus.OK)
  async ingestEmail(@Body() body: IngestEmailWebhookDto) {
    let dto;
    try {
      dto = parseN8nInboundEmailDto(body);
    } catch {
      throw new BadRequestException('Invalid inbound email payload');
    }

    const command = mapInboundEmailDtoToCommand(dto, body.request_id);
    const ingestResult = await this.ingestReplyUseCase.execute(command);

    if (ingestResult.type === 'ingested' && ingestResult.customerMessageId) {
      const analyzeResult = await this.analyzeReplyUseCase.execute({
        workflowId: ingestResult.workflow.id,
        customerMessageId: ingestResult.customerMessageId,
        requestId: body.request_id,
      });

      return {
        ingest: ingestResult.type,
        analyze: analyzeResult.type,
        workflow_id: ingestResult.workflow.id,
        status:
          analyzeResult.type === 'analyzed' ||
          analyzeResult.type === 'escalated'
            ? analyzeResult.workflow.status
            : ingestResult.workflow.status,
      };
    }

    return {
      ingest: ingestResult.type,
      workflow_id:
        ingestResult.type === 'escalated_unmatched'
          ? null
          : ingestResult.workflow.id,
      status:
        ingestResult.type === 'escalated_unmatched'
          ? null
          : ingestResult.workflow.status,
      ...(ingestResult.type === 'rejected'
        ? { reason: ingestResult.reason }
        : {}),
    };
  }

  @Post('workflow/follow-up-check')
  @HttpCode(HttpStatus.OK)
  async followUpCheck(@Body() body: FollowupCheckWebhookDto) {
    if (!body.workflow_id?.trim()) {
      throw new BadRequestException('workflow_id is required');
    }

    const result = await this.processFollowupCheckUseCase.execute({
      workflowId: body.workflow_id.trim(),
      now: body.now,
      requestId: body.request_id,
    });

    return result;
  }
}
