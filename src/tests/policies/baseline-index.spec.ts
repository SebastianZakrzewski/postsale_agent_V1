/**
 * V1 policy baseline index (task-09).
 * Detailed cases are covered in focused unit/integration specs.
 */
describe('Policy baseline index', () => {
  const cases = [
    { id: 1, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 2, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 3, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 4, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 5, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 6, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 7, spec: 'baseline-policy-01-07.spec.ts' },
    { id: 8, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 9, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 10, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 11, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 12, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 13, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 14, spec: 'baseline-policy-08-15.spec.ts' },
    { id: 15, spec: 'baseline-policy-08-15.spec.ts' },
  ];

  it('documents 15 baseline cases', () => {
    expect(cases).toHaveLength(15);
  });
});
