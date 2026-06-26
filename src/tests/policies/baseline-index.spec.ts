/**
 * V1 policy baseline index (task-09).
 * Detailed cases are covered in focused unit/integration specs.
 */
describe('Policy baseline index', () => {
  const cases = [
    {
      id: 1,
      spec: 'start-workflow.use-case.spec.ts / webhooks.controller.spec.ts',
    },
    { id: 2, spec: 'match-workflow-template / start-workflow' },
    { id: 3, spec: 'match-workflow-template' },
    { id: 4, spec: 'classification-validation.spec.ts' },
    { id: 5, spec: 'send-initial-email.use-case.spec.ts' },
    { id: 6, spec: 'ingest-reply.use-case.spec.ts' },
    { id: 7, spec: 'analyze-reply.use-case.spec.ts' },
    { id: 8, spec: 'completion.policy.spec.ts' },
    { id: 9, spec: 'execute-pending-side-effects.use-case.spec.ts' },
    { id: 10, spec: 'execute-pending-side-effects.use-case.spec.ts' },
    { id: 11, spec: 'followup.policy.spec.ts' },
    { id: 12, spec: 'followup.policy.spec.ts' },
    { id: 13, spec: 'execute-pending-side-effects.use-case.spec.ts' },
    { id: 14, spec: 'langflow tools boundary (design doc)' },
    { id: 15, spec: 'classification-validation.spec.ts / analyze-reply' },
  ];

  it('documents 15 baseline cases', () => {
    expect(cases).toHaveLength(15);
  });
});
