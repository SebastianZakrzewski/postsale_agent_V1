# V1 policy baseline tests (task-09)

Fifteen mandatory policy cases from the product spec. Each case uses Given / When / Then / Forbidden side effect format.

## Run

```bash
npm run test:policies
```

Full suite (includes policy tests):

```bash
npm test
```

Harness (docs + lint + typecheck + test + build):

```bash
powershell -File ./scripts/harness-check.ps1
```

On Linux/macOS or CI:

```bash
bash ./scripts/harness-check
```

## Case map

| Case | Scenario | Primary spec | Capability under test |
| --- | --- | --- | --- |
| 1 | Duplicate Bitrix trigger → one workflow | `baseline-policy-01-07.spec.ts` | `StartWorkflowUseCase` |
| 2 | Template not found → escalate | `baseline-policy-01-07.spec.ts` | `StartWorkflowUseCase` |
| 3 | Ambiguous template → escalate | `baseline-policy-01-07.spec.ts` | `TemplateMatchingService` |
| 4 | Unsafe Langflow notes → reject | `baseline-policy-01-07.spec.ts` | `validateClassifications` |
| 5 | No initial email before requirements | `baseline-policy-01-07.spec.ts` | `SendInitialEmailUseCase` |
| 6 | Unmatched reply → escalate | `baseline-policy-01-07.spec.ts` | `IngestReplyUseCase` |
| 7 | VALID without evidence → reject | `baseline-policy-01-07.spec.ts` | `AnalyzeReplyUseCase` |
| 8 | Incomplete requirements → no complete | `baseline-policy-08-15.spec.ts` | `CompletionPolicy` / `ApplyCompletionPolicyUseCase` |
| 9 | Complete → Bitrix stage update | `baseline-policy-08-15.spec.ts` | `ExecutePendingSideEffectsUseCase` |
| 10 | Bitrix failure → COMPLETED blocked | `baseline-policy-08-15.spec.ts` | `ExecutePendingSideEffectsUseCase` |
| 11 | Follow-up only when missing requirements | `baseline-policy-08-15.spec.ts` | `FollowupPolicy` |
| 12 | Max 3 follow-ups → escalation | `baseline-policy-08-15.spec.ts` | `FollowupPolicy` |
| 13 | Telegram failure → completion not blocked | `baseline-policy-08-15.spec.ts` | `ExecutePendingSideEffectsUseCase` |
| 14 | Langflow cannot bypass NestJS side effects | `baseline-policy-08-15.spec.ts` | `HttpLangflowAdapter` boundary |
| 15 | Confidence &lt; 0.75 rejected | `baseline-policy-08-15.spec.ts` | `validateClassifications` |

Index-only check: `baseline-index.spec.ts`.
