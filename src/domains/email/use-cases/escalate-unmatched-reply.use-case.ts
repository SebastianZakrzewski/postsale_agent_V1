import { Injectable, Logger } from '@nestjs/common';
import { IngestReplyCommand } from '../../../lib/commands/workflow.commands';
import { hashForLogCorrelation } from '../../../lib/observability/correlation-hash';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';

export interface EscalateUnmatchedReplyCommand {
  ingest: IngestReplyCommand;
  reason: string;
}

@Injectable()
export class EscalateUnmatchedReplyUseCase {
  private readonly logger = new Logger(EscalateUnmatchedReplyUseCase.name);

  execute(command: EscalateUnmatchedReplyCommand): void {
    const { ingest, reason } = command;
    this.logger.warn(
      structuredLogFields('unmatched_reply.escalated', {
        external_message_id: ingest.messageId,
        reason,
        from_email_hash: hashForLogCorrelation(ingest.fromEmail),
        thread_id: ingest.threadId,
        in_reply_to: ingest.inReplyTo ?? undefined,
        request_id: ingest.requestId,
      }),
    );
  }
}
