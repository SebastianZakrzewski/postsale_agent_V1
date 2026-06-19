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
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { DuplicateStartWorkflowInProgressError } from '../../domains/postsale-workflows/errors/start-workflow.errors';
import { StartWorkflowWebhookDto } from '../dto/webhook.dto';
import { mapStartWorkflowResultToWebhookResponse } from '../mappers/start-workflow-response.mapper';
import { parseStartWorkflowDto } from '../parsers/start-workflow.parser';
import { WebhookAuthGuard } from '../guards/webhook-auth.guard';

@Controller('webhooks')
@UseGuards(WebhookAuthGuard)
export class WebhooksController {
  constructor(private readonly startWorkflowUseCase: StartWorkflowUseCase) {}

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
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  ingestEmail(): { message: string } {
    return { message: 'Not implemented' };
  }
}
