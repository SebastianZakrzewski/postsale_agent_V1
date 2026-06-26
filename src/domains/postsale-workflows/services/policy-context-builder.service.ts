import { Inject, Injectable } from '@nestjs/common';
import { Workflow } from '../../../lib/domain';
import { SideEffectRecordStatus } from '../../../lib/enums';
import { WorkflowRequirementRow } from '../../../lib/persistence';
import {
  REQUIREMENT_EVIDENCE_REPOSITORY,
  RequirementEvidenceRepository,
} from '../../requirements/repository/requirement-evidence.repository';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../../requirements/repository/workflow-requirement.repository';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import { CompletionPolicyInput } from '../policies/completion.policy';

@Injectable()
export class PolicyContextBuilderService {
  constructor(
    @Inject(WORKFLOW_REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: WorkflowRequirementRepository,
    @Inject(REQUIREMENT_EVIDENCE_REPOSITORY)
    private readonly evidenceRepository: RequirementEvidenceRepository,
    private readonly sideEffectService: SideEffectService,
  ) {}

  async buildCompletionPolicyInput(
    workflow: Workflow,
    langflowAnalysisValid = true,
  ): Promise<CompletionPolicyInput> {
    const requirements = await this.requirementRepository.findByWorkflowId(
      workflow.id,
    );
    const evidence = await this.evidenceRepository.findByWorkflowId(
      workflow.id,
    );

    const evidenceCountByRequirementId = new Map<string, number>();
    for (const row of evidence) {
      evidenceCountByRequirementId.set(
        row.requirement_id,
        (evidenceCountByRequirementId.get(row.requirement_id) ?? 0) + 1,
      );
    }

    const completionRecord = await this.sideEffectService.findByIdempotencyKey(
      `${workflow.id}:bitrix_complete`,
    );

    return {
      workflow,
      requirements,
      evidenceCountByRequirementId,
      langflowAnalysisValid,
      bitrixCompletionSideEffectSucceeded:
        completionRecord?.status === SideEffectRecordStatus.SUCCEEDED,
    };
  }

  async loadRequirements(
    workflowId: string,
  ): Promise<WorkflowRequirementRow[]> {
    return this.requirementRepository.findByWorkflowId(workflowId);
  }
}
