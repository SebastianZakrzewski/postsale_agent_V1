import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRecorderService } from '../../domains/langflow/services/langflow-run-recorder.service';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { NoteSegmentationService } from '../../domains/requirements/services/note-segmentation.service';
import { SelectedTemplateNotesResolver } from '../../domains/requirements/services/selected-template-notes.resolver';
import { CreateRequirementsUseCase } from '../../domains/requirements/use-cases/create-requirements.use-case';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import {
  RequirementLabel,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import {
  buildAcuraMdxTemplate,
  InMemoryCarTemplateRepository,
} from '../helpers/in-memory-car-template.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryLangflowRunRepository } from '../helpers/in-memory-langflow-run.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import {
  buildValidClassificationRaw,
  MockLangflowProvider,
} from '../helpers/mock-langflow.provider';

describe('CreateRequirementsUseCase', () => {
  let useCase: CreateRequirementsUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let carTemplateRepository: InMemoryCarTemplateRepository;
  let langflowRuns: InMemoryLangflowRunRepository;
  let mockLangflow: MockLangflowProvider;
  let auditService: { emit: jest.Mock };

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    carTemplateRepository = new InMemoryCarTemplateRepository();
    langflowRuns = new InMemoryLangflowRunRepository();
    mockLangflow = new MockLangflowProvider();
    auditService = { emit: jest.fn().mockResolvedValue({}) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRequirementsUseCase,
        GetWorkflowContextUseCase,
        NoteSegmentationService,
        SelectedTemplateNotesResolver,
        TemplateMatchingService,
        TemplateNoteSelectionService,
        IdempotencyService,
        CheckIdempotencyUseCase,
        EmitWorkflowEventUseCase,
        EscalateWorkflowUseCase,
        LangflowRunRecorderService,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: new InMemoryIdempotencyRepository(),
        },
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
        {
          provide: WORKFLOW_REQUIREMENT_REPOSITORY,
          useValue: requirementRepository,
        },
        {
          provide: LANGFLOW_RUN_REPOSITORY,
          useValue: langflowRuns,
        },
        {
          provide: CarTemplateRepository,
          useValue: carTemplateRepository,
        },
        {
          provide: LANGFLOW_PROVIDER,
          useValue: mockLangflow,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(CreateRequirementsUseCase);
  });

  async function seedTemplateMatchedWorkflow() {
    carTemplateRepository.seed(buildAcuraMdxTemplate());
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-1',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: '2006-2013',
        product: '3D EVAPREMIUM Z RANTAMI',
        productEnumId: '264',
        setVariantId: '274',
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.TEMPLATE_MATCHED,
      carTemplateId: 'template-acura-mdx',
    });
    return workflow.id;
  }

  it('baseline case 4: unsafe Langflow notes escalate without persisting requirements', async () => {
    const workflowId = await seedTemplateMatchedWorkflow();
    mockLangflow.classifyHandler = () => ({
      classifications: [
        {
          source_field: 'notes_front_3d',
          source_note: 'Front 3D note',
          requirement_label: RequirementLabel.YES_NO_INFO,
          question_text: 'Please confirm: Front 3D note',
          classification_reason: 'test',
          confidence: 0.9,
          unsafe: false,
        },
      ],
      unsafe_notes: ['unsafe note detected'],
    });

    const outcome = await useCase.execute({ workflowId });

    expect(outcome.type).toBe('escalated');
    if (outcome.type === 'escalated') {
      expect(outcome.reason).toBe('unsafe_notes');
      expect(outcome.workflow.status).toBe(WorkflowStatus.ESCALATED);
    }
    expect(
      await requirementRepository.findByWorkflowId(workflowId),
    ).toHaveLength(0);
    expect(langflowRuns.all()).toHaveLength(1);
    expect(langflowRuns.all()[0]).toMatchObject({
      parsed_success: false,
      validation_errors: 'unsafe_notes',
      raw_output: null,
    });
  });

  it('baseline case 15: confidence below 0.75 escalates without requirements', async () => {
    const workflowId = await seedTemplateMatchedWorkflow();
    mockLangflow.classifyHandler = () =>
      buildValidClassificationRaw('Front 3D note', {
        classifications: [
          {
            source_field: 'notes_front_3d',
            source_note: 'Front 3D note',
            requirement_label: RequirementLabel.YES_NO_INFO,
            question_text: 'Please confirm: Front 3D note',
            classification_reason: 'test',
            confidence: 0.5,
            unsafe: false,
          },
        ],
      });

    const outcome = await useCase.execute({ workflowId });

    expect(outcome.type).toBe('escalated');
    if (outcome.type === 'escalated') {
      expect(outcome.reason).toBe('low_confidence');
    }
    expect(
      await requirementRepository.findByWorkflowId(workflowId),
    ).toHaveLength(0);
    expect(langflowRuns.all()).toHaveLength(1);
    expect(langflowRuns.all()[0]).toMatchObject({
      parsed_success: false,
      validation_errors: 'low_confidence',
      raw_output: null,
    });
  });

  it('persists requirements and moves workflow to REQUIREMENTS_CREATED on success', async () => {
    const workflowId = await seedTemplateMatchedWorkflow();
    mockLangflow.classifyHandler = () =>
      buildValidClassificationRaw('Front 3D note');

    const outcome = await useCase.execute({ workflowId });

    expect(outcome.type).toBe('created');
    if (outcome.type === 'created') {
      expect(outcome.workflow.status).toBe(WorkflowStatus.REQUIREMENTS_CREATED);
      expect(outcome.requirementIds.length).toBeGreaterThan(0);
    }
    expect(langflowRuns.all()).toHaveLength(1);
    expect(langflowRuns.all()[0]).toMatchObject({
      parsed_success: true,
      validation_errors: null,
      raw_output: null,
    });
  });

  it('segments compound numbered notes before classify and persists multiple requirements', async () => {
    const compoundNote =
      '1) Proszę sprawdzić czy ma Pan haczyki w bagażniku i czy chciałby Pan mieć wycięcia pod haczyki? (zalecamy nie robić wycięć). 2) Proszę o informację czy przykrywamy wnękę w bagażniku?';

    carTemplateRepository.seed(
      buildAcuraMdxTemplate({
        notes_general: null,
        notes_front_3d: compoundNote,
        notes_rear_3d: null,
        notes_trunk_suv_7_seater: null,
      }),
    );

    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-compound-note',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-compound-note',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: '2006-2013',
        product: '3D EVAPREMIUM Z RANTAMI',
        productEnumId: '264',
        setVariantId: '274',
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.TEMPLATE_MATCHED,
      carTemplateId: 'template-acura-mdx',
    });

    const invokeSpy = jest.spyOn(mockLangflow, 'invoke');
    mockLangflow.classifyHandler = (input) => {
      const notes = input.notes as Array<{ text: string; column: string }>;
      return {
        classifications: notes.map((item) => ({
          source_field: item.column,
          source_note: item.text,
          requirement_label: RequirementLabel.YES_NO_INFO,
          question_text: `Please confirm: ${item.text}`,
          classification_reason: 'test',
          confidence: 0.9,
          unsafe: false,
        })),
        unsafe_notes: [],
      };
    };

    const outcome = await useCase.execute({ workflowId: workflow.id });

    expect(outcome.type).toBe('created');
    expect(invokeSpy).toHaveBeenCalledTimes(1);
    const classifyInput = invokeSpy.mock.calls[0][1] as {
      notes: Array<{ text: string }>;
    };
    expect(classifyInput.notes).toHaveLength(2);
    expect(classifyInput.notes[0].text).toContain('haczyki');
    expect(classifyInput.notes[1].text).toContain('wnękę');

    const requirements = await requirementRepository.findByWorkflowId(
      workflow.id,
    );
    expect(requirements).toHaveLength(2);
    expect(requirements.map((row) => row.source_note)).toEqual(
      expect.arrayContaining([
        'Proszę sprawdzić czy ma Pan haczyki w bagażniku i czy chciałby Pan mieć wycięcia pod haczyki? (zalecamy nie robić wycięć).',
        'Proszę o informację czy przykrywamy wnękę w bagażniku?',
      ]),
    );
  });

  it('OD-015: zero selected notes skip Langflow and create zero requirements', async () => {
    carTemplateRepository.seed(
      buildAcuraMdxTemplate({
        notes_general: null,
        notes_front_3d: null,
        notes_rear_3d: null,
        notes_trunk_suv_7_seater: null,
      }),
    );
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-zero-notes',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-zero-notes',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: '2006-2013',
        product: '3D EVAPREMIUM Z RANTAMI',
        productEnumId: '264',
        setVariantId: '274',
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.TEMPLATE_MATCHED,
      carTemplateId: 'template-acura-mdx',
    });

    const invokeSpy = jest.spyOn(mockLangflow, 'invoke');
    const outcome = await useCase.execute({ workflowId: workflow.id });

    expect(invokeSpy).not.toHaveBeenCalled();
    expect(outcome.type).toBe('created');
    if (outcome.type === 'created') {
      expect(outcome.workflow.status).toBe(WorkflowStatus.REQUIREMENTS_CREATED);
      expect(outcome.requirementIds).toHaveLength(0);
    }
    expect(
      await requirementRepository.findByWorkflowId(workflow.id),
    ).toHaveLength(0);
    expect(langflowRuns.all()).toHaveLength(0);
  });
});
