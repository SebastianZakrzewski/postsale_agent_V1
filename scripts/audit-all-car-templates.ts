/**
 * Full audit: every car_templates row vs Stage 1 self-match + Stage 2 note scenarios.
 *
 * Usage:
 *   npx ts-node scripts/audit-all-car-templates.ts
 *   npx ts-node scripts/audit-all-car-templates.ts --save=scripts/.car-templates-audit.json
 */
import * as fs from 'fs';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../src/domains/template-matching/services/template-note-selection.service';
import { CarTemplateWideRow } from '../src/domains/template-matching/types';
import { toCarTemplateWideRow } from '../src/lib/persistence/mappers/car-template.mapper';
import { CarTemplateRow } from '../src/lib/persistence/rows';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';
import { InMemoryCarTemplateRepository } from '../src/tests/helpers/in-memory-car-template.repository';

const NOTE_SCENARIOS = [
  {
    id: '3d_full_set_276',
    product: '3D EVAPREMIUM Z RANTAMI',
    productEnumId: '264',
    setVariantId: '276',
  },
  {
    id: 'classic_front_rear_274',
    product: 'Klasyczne EVAPREMIUM BEZ RANTÓW',
    productEnumId: '266',
    setVariantId: '274',
  },
  {
    id: '3d_front_only_270',
    product: '3D EVAPREMIUM Z RANTAMI',
    productEnumId: '264',
    setVariantId: '270',
  },
  {
    id: '3d_trunk_only_1250',
    product: '3D EVAPREMIUM Z RANTAMI',
    productEnumId: '264',
    setVariantId: '1250',
  },
] as const;

type Stage1Outcome =
  | 'matched_self'
  | 'matched_other'
  | 'ambiguous'
  | 'not_found'
  | 'missing_generation';

interface RowAudit {
  templateId: string;
  brand: string;
  model: string;
  generation: string | null;
  body_type_1: string;
  stage1: Stage1Outcome;
  matchedTemplateId?: string;
  ambiguousCandidateIds?: string[];
  stage1Reason?: string;
  notesByScenario: Record<
    string,
    { noteCount: number; columns: string[]; usedTrunkFallback: boolean }
  >;
}

function parseSaveArg(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--save='));
  return arg?.slice('--save='.length);
}

function vehicleKey(row: CarTemplateWideRow): string {
  return `${row.brand}|${row.model}|${row.generation ?? ''}`;
}

async function loadAllTemplates(): Promise<CarTemplateWideRow[]> {
  loadProjectDotEnv();
  const client = createSupabaseClient();
  const rows: CarTemplateWideRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('car_templates')
      .select('*')
      .order('id')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load car_templates: ${error.message}`);
    }

    const batch = (data as CarTemplateRow[]) ?? [];
    rows.push(...batch.map(toCarTemplateWideRow));

    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function main(): Promise<void> {
  const savePath = parseSaveArg(process.argv.slice(2));
  console.error('Loading car_templates...');
  const templates = await loadAllTemplates();
  console.error(`Loaded ${templates.length} templates`);

  const repository = new InMemoryCarTemplateRepository();
  repository.seed(...templates);
  const matchingService = new TemplateMatchingService(repository);
  const noteService = new TemplateNoteSelectionService();

  const duplicateGroups = new Map<string, string[]>();
  for (const row of templates) {
    const key = vehicleKey(row);
    const ids = duplicateGroups.get(key) ?? [];
    ids.push(row.id);
    duplicateGroups.set(key, ids);
  }

  const ambiguousKeys = [...duplicateGroups.entries()].filter(
    ([, ids]) => ids.length > 1,
  );

  const stage1Counts: Record<Stage1Outcome, number> = {
    matched_self: 0,
    matched_other: 0,
    ambiguous: 0,
    not_found: 0,
    missing_generation: 0,
  };

  const scenarioStats: Record<
    string,
    {
      withNotes: number;
      zeroNotes: number;
      trunkFallback: number;
      totalNotes: number;
    }
  > = {};

  for (const scenario of NOTE_SCENARIOS) {
    scenarioStats[scenario.id] = {
      withNotes: 0,
      zeroNotes: 0,
      trunkFallback: 0,
      totalNotes: 0,
    };
  }

  const failures: RowAudit[] = [];
  const sampleFailures: RowAudit[] = [];
  const maxSamples = 30;

  for (const row of templates) {
    const dealContext = {
      bitrixDealId: `audit-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: row.generation,
      product: NOTE_SCENARIOS[0].product,
      productEnumId: NOTE_SCENARIOS[0].productEnumId,
      setVariantId: NOTE_SCENARIOS[0].setVariantId,
    };

    let stage1: Stage1Outcome;
    let matchedTemplateId: string | undefined;
    let ambiguousCandidateIds: string[] | undefined;
    let stage1Reason: string | undefined;

    let matchResult: Awaited<
      ReturnType<TemplateMatchingService['matchDealContext']>
    > | null = null;

    if (!row.generation) {
      stage1 = 'missing_generation';
      stage1Counts.missing_generation += 1;
    } else {
      matchResult = await matchingService.matchDealContext(dealContext);

      if (matchResult.status === 'MATCHED') {
        matchedTemplateId = matchResult.carTemplate.id;
        stage1 =
          matchResult.carTemplate.id === row.id ? 'matched_self' : 'matched_other';
        stage1Counts[stage1] += 1;
      } else if (matchResult.status === 'AMBIGUOUS') {
        stage1 = 'ambiguous';
        ambiguousCandidateIds = matchResult.candidateIds;
        stage1Reason = matchResult.escalationReason;
        stage1Counts.ambiguous += 1;
      } else {
        stage1 = 'not_found';
        stage1Reason = matchResult.escalationReason;
        stage1Counts.not_found += 1;
      }
    }

    const notesByScenario: RowAudit['notesByScenario'] = {};

    if (stage1 === 'matched_self' && matchResult?.status === 'MATCHED') {
      for (const scenario of NOTE_SCENARIOS) {
        const selection = noteService.selectNotes({
          carTemplate: row,
          product: scenario.product,
          productEnumId: scenario.productEnumId,
          setVariantId: scenario.setVariantId,
          resolvedBodyProfile: matchResult.resolvedBodyProfile,
        });

          const usedTrunkFallback = selection.notes.some(
            (n) =>
              n.part === 'trunk' && n.column === 'notes_trunk_general',
          );

          notesByScenario[scenario.id] = {
            noteCount: selection.notes.length,
            columns: selection.notes.map((n) => n.column),
            usedTrunkFallback,
          };

          const stats = scenarioStats[scenario.id]!;
          if (selection.notes.length > 0) {
            stats.withNotes += 1;
            stats.totalNotes += selection.notes.length;
          } else {
            stats.zeroNotes += 1;
          }
          if (usedTrunkFallback) {
            stats.trunkFallback += 1;
          }
        }
    }

    if (stage1 !== 'matched_self') {
      const audit: RowAudit = {
        templateId: row.id,
        brand: row.brand,
        model: row.model,
        generation: row.generation,
        body_type_1: row.body_type_1,
        stage1,
        matchedTemplateId,
        ambiguousCandidateIds,
        stage1Reason,
        notesByScenario,
      };
      failures.push(audit);
      if (sampleFailures.length < maxSamples) {
        sampleFailures.push(audit);
      }
    }
  }

  const selfMatchRate =
    templates.length > 0
      ? Math.round((stage1Counts.matched_self / templates.length) * 1000) / 10
      : 0;

  const report = {
    auditedAt: new Date().toISOString(),
    totalTemplates: templates.length,
    duplicateVehicleKeys: ambiguousKeys.length,
    duplicateVehicleKeyRows: ambiguousKeys.reduce(
      (sum, [, ids]) => sum + ids.length,
      0,
    ),
    stage1: {
      counts: stage1Counts,
      selfMatchRatePercent: selfMatchRate,
    },
    noteScenarios: Object.fromEntries(
      NOTE_SCENARIOS.map((s) => [
        s.id,
        {
          ...scenarioStats[s.id],
          withNotesRatePercent:
            stage1Counts.matched_self > 0
              ? Math.round(
                  (scenarioStats[s.id]!.withNotes / stage1Counts.matched_self) *
                    1000,
                ) / 10
              : 0,
        },
      ]),
    ),
    sampleStage1Failures: sampleFailures,
    stage1FailureTotal: failures.length,
  };

  console.log('\n=== car_templates full audit ===\n');
  console.log(`Total templates: ${report.totalTemplates}`);
  console.log(
    `Duplicate vehicle keys (brand|model|generation): ${report.duplicateVehicleKeys} groups, ${report.duplicateVehicleKeyRows} rows`,
  );
  console.log('\nStage 1 self-match (deal mirrors template row):');
  console.log(`  matched_self:      ${stage1Counts.matched_self} (${selfMatchRate}%)`);
  console.log(`  matched_other:     ${stage1Counts.matched_other}`);
  console.log(`  ambiguous:         ${stage1Counts.ambiguous}`);
  console.log(`  not_found:         ${stage1Counts.not_found}`);
  console.log(`  missing_generation:${stage1Counts.missing_generation}`);

  console.log('\nStage 2 note scenarios (on matched_self rows only):');
  for (const scenario of NOTE_SCENARIOS) {
    const s = report.noteScenarios[scenario.id] as {
      withNotes: number;
      zeroNotes: number;
      trunkFallback: number;
      withNotesRatePercent: number;
    };
    console.log(
      `  ${scenario.id}: ${s.withNotes} with notes (${s.withNotesRatePercent}%), ${s.zeroNotes} empty, trunk fallback ${s.trunkFallback}`,
    );
  }

  const outputPath =
    savePath ?? `scripts/.car-templates-audit-${report.auditedAt.slice(0, 10)}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.error(`\nArtifact: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
