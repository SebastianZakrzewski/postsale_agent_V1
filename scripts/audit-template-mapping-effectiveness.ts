/**
 * Effectiveness audit: every car_templates row from Supabase PROD,
 * mapped via toCarTemplateWideRow, Stage 1 self-match, then Stage 2 for
 * every Bitrix product line × set variant.
 *
 * Verifies note selection logic against expected columns (incl. trunk fallback).
 *
 * Usage:
 *   npx ts-node scripts/audit-template-mapping-effectiveness.ts
 *   npx ts-node scripts/audit-template-mapping-effectiveness.ts --save=scripts/.template-mapping-effectiveness.json
 */
import * as fs from 'fs';
import {
  BITRIX_PRODUCT_ENUM_LABELS,
  BITRIX_SET_VARIANT_LABELS,
} from '../src/domains/bitrix/config/bitrix-deal-labels';
import { resolveProductLine } from '../src/domains/template-matching/config/bitrix-product-line';
import {
  BITRIX_SET_VARIANT_ESCALATION_IDS,
  BITRIX_SET_VARIANT_PARTS,
  resolveSetVariantParts,
} from '../src/domains/template-matching/config/bitrix-set-variant-parts';
import {
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../src/domains/template-matching/config/note-column-resolver';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../src/domains/template-matching/services/template-note-selection.service';
import {
  BodyTypeProfile,
  CarTemplateWideRow,
  SelectedTemplateNote,
} from '../src/domains/template-matching/types';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';
import { toCarTemplateWideRow } from '../src/lib/persistence/mappers/car-template.mapper';
import { CarTemplateRow } from '../src/lib/persistence/rows';
import { InMemoryCarTemplateRepository } from '../src/tests/helpers/in-memory-car-template.repository';

interface ProductScenario {
  productEnumId: string;
  product: string;
}

interface NoteScenario extends ProductScenario {
  setVariantId: string;
  setVariantLabel: string;
  expectsEscalation: boolean;
  escalationReason?:
    | 'requires_custom_product_escalation'
    | 'single_mat_variant_escalation'
    | 'requires_set_variant_escalation';
}

interface ScenarioStats {
  productEnumId: string;
  product: string;
  setVariantId: string;
  setVariantLabel: string;
  expectsEscalation: boolean;
  testsRun: number;
  escalationOk: number;
  escalationFail: number;
  withNotes: number;
  zeroNotesDataGap: number;
  logicCorrect: number;
  logicMiss: number;
  trunkFallback: number;
  sampleLogicMisses: Array<{
    templateId: string;
    brand: string;
    model: string;
    body_type_1: string;
    expected: SelectedTemplateNote[];
    actual: SelectedTemplateNote[];
  }>;
}

function parseSaveArg(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--save='));
  return arg?.slice('--save='.length);
}

function buildNoteScenarios(): NoteScenario[] {
  const products: ProductScenario[] = Object.entries(
    BITRIX_PRODUCT_ENUM_LABELS,
  ).map(([productEnumId, product]) => ({ productEnumId, product }));

  const scenarios: NoteScenario[] = [];

  for (const product of products) {
    for (const [setVariantId, setVariantLabel] of Object.entries(
      BITRIX_SET_VARIANT_LABELS,
    )) {
      const productLine = resolveProductLine({
        product: product.product,
        productEnumId: product.productEnumId,
      });
      const variant = resolveSetVariantParts(setVariantId);

      let expectsEscalation = false;
      let escalationReason: NoteScenario['escalationReason'];

      if (productLine.requiresCustomProductEscalation) {
        expectsEscalation = true;
        escalationReason = 'requires_custom_product_escalation';
      } else if (variant.escalateSingleMat) {
        expectsEscalation = true;
        escalationReason = 'single_mat_variant_escalation';
      } else if (variant.requiresSetVariantEscalation) {
        expectsEscalation = true;
        escalationReason = 'requires_set_variant_escalation';
      } else if (productLine.unknownProduct || !productLine.line) {
        expectsEscalation = true;
      }

      scenarios.push({
        ...product,
        setVariantId,
        setVariantLabel,
        expectsEscalation,
        escalationReason,
      });
    }
  }

  return scenarios;
}

function noteKey(notes: SelectedTemplateNote[]): string {
  return notes
    .map((n) => `${n.part}|${n.column}|${n.text}`)
    .sort()
    .join(';;');
}

function buildExpectedNotes(
  row: CarTemplateWideRow,
  productLine: '3d' | 'classic',
  parts: readonly string[],
  bodyProfile: BodyTypeProfile,
): SelectedTemplateNote[] {
  const expected: SelectedTemplateNote[] = [];

  for (const part of parts) {
    const column = resolveNoteColumnForPart(
      part as Parameters<typeof resolveNoteColumnForPart>[0],
      productLine,
      bodyProfile,
    );
    const { text, column: resolvedColumn } = readNoteTextForPart(
      row,
      part as Parameters<typeof readNoteTextForPart>[1],
      column,
    );
    if (text) {
      expected.push({
        part: part as SelectedTemplateNote['part'],
        column: resolvedColumn,
        text,
      });
    }
  }

  return expected;
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
  const noteScenarios = buildNoteScenarios();

  console.error('Loading car_templates from Supabase...');
  const templates = await loadAllTemplates();
  console.error(`Loaded ${templates.length} templates (via toCarTemplateWideRow)`);
  console.error(
    `Note scenarios: ${noteScenarios.length} (${Object.keys(BITRIX_PRODUCT_ENUM_LABELS).length} products × ${Object.keys(BITRIX_SET_VARIANT_LABELS).length} variants)`,
  );

  const repository = new InMemoryCarTemplateRepository();
  repository.seed(...templates);
  const matchingService = new TemplateMatchingService(repository);
  const noteService = new TemplateNoteSelectionService();

  const stage1Counts = {
    matched_self: 0,
    matched_other: 0,
    ambiguous: 0,
    not_found: 0,
    missing_generation: 0,
  };

  const scenarioStats = new Map<string, ScenarioStats>();
  for (const scenario of noteScenarios) {
    const key = `${scenario.productEnumId}:${scenario.setVariantId}`;
    scenarioStats.set(key, {
      productEnumId: scenario.productEnumId,
      product: scenario.product,
      setVariantId: scenario.setVariantId,
      setVariantLabel: scenario.setVariantLabel,
      expectsEscalation: scenario.expectsEscalation,
      testsRun: 0,
      escalationOk: 0,
      escalationFail: 0,
      withNotes: 0,
      zeroNotesDataGap: 0,
      logicCorrect: 0,
      logicMiss: 0,
      trunkFallback: 0,
      sampleLogicMisses: [],
    });
  }

  const stage1Failures: Array<{
    templateId: string;
    brand: string;
    model: string;
    generation: string | null;
    body_type_1: string;
    stage1: string;
    reason?: string;
  }> = [];

  let totalLogicMisses = 0;

  for (const row of templates) {
    const dealContext = {
      bitrixDealId: `effectiveness-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: row.generation,
      product: BITRIX_PRODUCT_ENUM_LABELS['264']!,
      productEnumId: '264',
      setVariantId: '276',
    };

    if (!row.generation) {
      stage1Counts.missing_generation += 1;
      stage1Failures.push({
        templateId: row.id,
        brand: row.brand,
        model: row.model,
        generation: row.generation,
        body_type_1: row.body_type_1,
        stage1: 'missing_generation',
      });
      continue;
    }

    const matchResult = await matchingService.matchDealContext(dealContext);

    if (matchResult.status === 'MATCHED') {
      if (matchResult.carTemplate.id === row.id) {
        stage1Counts.matched_self += 1;
      } else {
        stage1Counts.matched_other += 1;
        stage1Failures.push({
          templateId: row.id,
          brand: row.brand,
          model: row.model,
          generation: row.generation,
          body_type_1: row.body_type_1,
          stage1: 'matched_other',
          reason: matchResult.carTemplate.id,
        });
      }
    } else if (matchResult.status === 'AMBIGUOUS') {
      stage1Counts.ambiguous += 1;
      stage1Failures.push({
        templateId: row.id,
        brand: row.brand,
        model: row.model,
        generation: row.generation,
        body_type_1: row.body_type_1,
        stage1: 'ambiguous',
        reason: matchResult.escalationReason,
      });
      continue;
    } else {
      stage1Counts.not_found += 1;
      stage1Failures.push({
        templateId: row.id,
        brand: row.brand,
        model: row.model,
        generation: row.generation,
        body_type_1: row.body_type_1,
        stage1: 'not_found',
        reason: matchResult.escalationReason,
      });
      continue;
    }

    if (matchResult.status !== 'MATCHED' || matchResult.carTemplate.id !== row.id) {
      continue;
    }

    const bodyProfile = matchResult.resolvedBodyProfile;

    for (const scenario of noteScenarios) {
      const statsKey = `${scenario.productEnumId}:${scenario.setVariantId}`;
      const stats = scenarioStats.get(statsKey)!;
      stats.testsRun += 1;

      const selection = noteService.selectNotes({
        carTemplate: row,
        product: scenario.product,
        productEnumId: scenario.productEnumId,
        setVariantId: scenario.setVariantId,
        resolvedBodyProfile: bodyProfile,
      });

      if (scenario.expectsEscalation) {
        if (
          selection.requiresEscalation &&
          (!scenario.escalationReason ||
            selection.escalationReason === scenario.escalationReason)
        ) {
          stats.escalationOk += 1;
        } else {
          stats.escalationFail += 1;
          totalLogicMisses += 1;
        }
        continue;
      }

      if (selection.requiresEscalation) {
        stats.logicMiss += 1;
        totalLogicMisses += 1;
        if (stats.sampleLogicMisses.length < 3) {
          stats.sampleLogicMisses.push({
            templateId: row.id,
            brand: row.brand,
            model: row.model,
            body_type_1: row.body_type_1,
            expected: [],
            actual: selection.notes,
          });
        }
        continue;
      }

      const productLine = resolveProductLine({
        product: scenario.product,
        productEnumId: scenario.productEnumId,
      }).line as '3d' | 'classic';
      const parts = resolveSetVariantParts(scenario.setVariantId).parts;
      const expected = buildExpectedNotes(row, productLine, parts, bodyProfile);

      const usedTrunkFallback = selection.notes.some(
        (n) => n.part === 'trunk' && n.column === 'notes_trunk_general',
      );
      if (usedTrunkFallback) {
        stats.trunkFallback += 1;
      }

      if (noteKey(selection.notes) === noteKey(expected)) {
        stats.logicCorrect += 1;
        if (selection.notes.length > 0) {
          stats.withNotes += 1;
        } else {
          stats.zeroNotesDataGap += 1;
        }
      } else {
        stats.logicMiss += 1;
        totalLogicMisses += 1;
        if (stats.sampleLogicMisses.length < 3) {
          stats.sampleLogicMisses.push({
            templateId: row.id,
            brand: row.brand,
            model: row.model,
            body_type_1: row.body_type_1,
            expected,
            actual: selection.notes,
          });
        }
        if (selection.notes.length > 0) {
          stats.withNotes += 1;
        }
      }
    }
  }

  const matchedSelf = stage1Counts.matched_self;
  const selfMatchRate =
    templates.length > 0
      ? Math.round((matchedSelf / templates.length) * 1000) / 10
      : 0;

  const scenarioRows = [...scenarioStats.values()].map((s) => {
    const nonEscalationTests = s.testsRun - s.escalationOk - s.escalationFail;
    const logicTests = s.logicCorrect + s.logicMiss;
    return {
      ...s,
      withNotesRatePercent:
        nonEscalationTests > 0
          ? Math.round((s.withNotes / nonEscalationTests) * 1000) / 10
          : 0,
      logicAccuracyPercent:
        logicTests > 0 ? Math.round((s.logicCorrect / logicTests) * 1000) / 10 : 100,
      dataCoveragePercent:
        nonEscalationTests > 0
          ? Math.round(
              ((s.withNotes + s.zeroNotesDataGap) / nonEscalationTests) * 1000,
            ) / 10
          : 0,
      escalationAccuracyPercent:
        s.escalationOk + s.escalationFail > 0
          ? Math.round(
              (s.escalationOk / (s.escalationOk + s.escalationFail)) * 1000,
            ) / 10
          : 100,
    };
  });

  const nonEscalationScenarios = scenarioRows.filter((s) => !s.expectsEscalation);
  const totalNonEscalationTests = nonEscalationScenarios.reduce(
    (sum, s) => sum + s.logicCorrect + s.logicMiss,
    0,
  );
  const totalLogicCorrect = nonEscalationScenarios.reduce(
    (sum, s) => sum + s.logicCorrect,
    0,
  );
  const overallLogicAccuracy =
    totalNonEscalationTests > 0
      ? Math.round((totalLogicCorrect / totalNonEscalationTests) * 1000) / 10
      : 100;

  const escalationScenarios = scenarioRows.filter((s) => s.expectsEscalation);
  const totalEscalationTests = escalationScenarios.reduce(
    (sum, s) => sum + s.escalationOk + s.escalationFail,
    0,
  );
  const totalEscalationOk = escalationScenarios.reduce(
    (sum, s) => sum + s.escalationOk,
    0,
  );

  const report = {
    auditedAt: new Date().toISOString(),
    dataSource: 'supabase.car_templates (PROD via .env)',
    mapper: 'toCarTemplateWideRow',
    totalTemplates: templates.length,
    productsTested: Object.keys(BITRIX_PRODUCT_ENUM_LABELS),
    variantsTested: Object.keys(BITRIX_SET_VARIANT_LABELS),
    mappedVariants: Object.keys(BITRIX_SET_VARIANT_PARTS),
    escalationVariantIds: [...BITRIX_SET_VARIANT_ESCALATION_IDS],
    stage1: {
      counts: stage1Counts,
      selfMatchRatePercent: selfMatchRate,
      failureTotal: stage1Failures.length,
      sampleFailures: stage1Failures.slice(0, 20),
    },
    stage2: {
      matchedSelfRows: matchedSelf,
      totalScenarioRuns: matchedSelf * noteScenarios.length,
      overallLogicAccuracyPercent: overallLogicAccuracy,
      totalLogicMisses,
      escalationAccuracyPercent:
        totalEscalationTests > 0
          ? Math.round((totalEscalationOk / totalEscalationTests) * 1000) / 10
          : 100,
      byScenario: scenarioRows,
    },
  };

  console.log('\n=== Template mapping effectiveness audit (PROD data) ===\n');
  console.log(`Templates loaded: ${report.totalTemplates}`);
  console.log(`Mapper: ${report.mapper}`);
  console.log(
    `Products: ${report.productsTested.join(', ')} | Variants: ${report.variantsTested.length}`,
  );

  console.log('\n--- Stage 1: template self-match ---');
  console.log(`  matched_self:  ${stage1Counts.matched_self} (${selfMatchRate}%)`);
  console.log(`  ambiguous:     ${stage1Counts.ambiguous}`);
  console.log(`  not_found:     ${stage1Counts.not_found}`);
  console.log(`  matched_other: ${stage1Counts.matched_other}`);

  console.log('\n--- Stage 2: note logic accuracy (all product × variant) ---');
  console.log(`  Rows tested:           ${matchedSelf}`);
  console.log(`  Scenario runs:         ${report.stage2.totalScenarioRuns}`);
  console.log(`  Logic accuracy:        ${overallLogicAccuracy}%`);
  console.log(`  Logic misses (bugs):   ${totalLogicMisses}`);
  console.log(
    `  Escalation accuracy:   ${report.stage2.escalationAccuracyPercent}%`,
  );

  console.log('\n--- Stage 2 by product × variant (non-escalation) ---');
  for (const s of nonEscalationScenarios) {
    console.log(
      `  [${s.productEnumId}] ${s.setVariantLabel} (${s.setVariantId}): ` +
        `logic ${s.logicAccuracyPercent}%, notes ${s.withNotesRatePercent}% ` +
        `(${s.withNotes}/${s.logicCorrect + s.logicMiss}), trunk fb ${s.trunkFallback}`,
    );
  }

  console.log('\n--- Stage 2 escalation scenarios ---');
  for (const s of escalationScenarios) {
    if (s.testsRun === 0) continue;
    console.log(
      `  [${s.productEnumId}] ${s.setVariantLabel}: escalation ${s.escalationAccuracyPercent}% (${s.escalationOk}/${s.escalationOk + s.escalationFail})`,
    );
  }

  const outputPath =
    savePath ??
    `scripts/.template-mapping-effectiveness-${report.auditedAt.slice(0, 10)}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.error(`\nArtifact: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
