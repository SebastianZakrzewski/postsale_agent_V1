# Template Matching — Validation Reference

Status: Evidence snapshot  
Last updated: 2026-06-24  
Data source: Supabase PROD `car_templates` (2655 rows)

## Implementation

| Component | Path |
| --- | --- |
| Stage 1 matcher | `src/domains/template-matching/services/template-matching.service.ts` |
| Stage 2 notes | `src/domains/template-matching/services/template-note-selection.service.ts` |
| Body compatibility | `src/domains/template-matching/config/body-type-compatibility.ts` |
| Note columns | `src/domains/template-matching/config/note-column-resolver.ts` |
| Set variant parts | `src/domains/template-matching/config/bitrix-set-variant-parts.ts` |
| Workflow wiring | `src/domains/postsale-workflows/use-cases/match-workflow-template.use-case.ts` |
| Mapper | `src/lib/persistence/mappers/car-template.mapper.ts` |

## Automated checks

```bash
npm test                                    # 106 unit/integration tests
npx ts-node scripts/audit-all-car-templates.ts
npx ts-node scripts/audit-template-mapping-effectiveness.ts
npx ts-node scripts/audit-template-edge-cases-prod.ts
npx ts-node scripts/benchmark-stage-deals.ts --stage=PREPAYMENT_INVOICE
```

## PROD audit results (2026-06-24)

### Stage 1 self-match (all templates)

| Outcome | Count | % |
| --- | ---: | ---: |
| matched_self | 2639 | 99.4% |
| ambiguous | 16 | 0.6% |
| not_found | 0 | 0% |

Ambiguous rows: duplicate `brand|model|generation` with multiple SUV-compatible `body_type_*` variants (71 groups, 149 rows).

### Stage 2 logic accuracy (3 products × 15 set variants)

| Metric | Result |
| --- | --- |
| Scenario runs | 118 755 |
| Logic accuracy | **100%** (0 misses) |
| Escalation accuracy (268, 1300, 1310) | **100%** |

Note **coverage** (non-empty `notes_*` in DB) varies by variant — e.g. 3D full set (276) ~41% of templates have at least one note. Coverage gaps are data issues, not mapping bugs.

### Edge cases (PROD)

| Scenario | Result |
| --- | --- |
| Duplicate SUV groups → generic SUV deal ambiguous | 6/6 groups |
| Duplicate self-match with own body_type | 149/149 |
| Van labels (Van / Van dostawczy / Van dostawczak) | 159/159 |
| Trunk fallback `notes_trunk_general` for SUV 5-seat | 223/223 |
| Polish Bitrix body labels | 151/151 |
| Generation en-dash vs DB hyphen | expected NOT_FOUND |

### Known limitations

1. **En-dash in generation** (`2006 – 2013`) does not normalize to `2006-2013` — deal may miss template.
2. **Trunk fallback** applies only to `notes_trunk_suv_5_seater` → `notes_trunk_general`, not SUV 7-seat column.
3. **Sparse notes per product line** — e.g. A6 Allroad C6 may have front note in `notes_front_3d` and rear in `notes_rear_classic`; 3D Przód+Tył returns only front.

## Business rules (decision-log)

- Empty `notes_*` → success, no escalation (Stage 2).
- Custom product (268), single-mat variants (1300/1310), unknown set variant → escalation.
- Van / `van_dseaterawczak` compatibility for legacy EVAMATS import slug.
