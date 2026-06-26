import { SendCompletionConfirmationEmailUseCase } from '../../domains/email/use-cases/send-completion-confirmation-email.use-case';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { InMemoryRequirementEvidenceRepository } from './in-memory-requirement-evidence.repository';
import { InMemoryWorkflowRequirementRepository } from './in-memory-workflow-requirement.repository';

export function buildExecutePendingSideEffectsTestProviders(
  requirementRepository = new InMemoryWorkflowRequirementRepository(),
  evidenceRepository = new InMemoryRequirementEvidenceRepository(),
) {
  return [
    {
      provide: WORKFLOW_REQUIREMENT_REPOSITORY,
      useValue: requirementRepository,
    },
    {
      provide: REQUIREMENT_EVIDENCE_REPOSITORY,
      useValue: evidenceRepository,
    },
    {
      provide: SendCompletionConfirmationEmailUseCase,
      useValue: {
        execute: jest.fn().mockResolvedValue({ type: 'sent' }),
      },
    },
  ];
}
