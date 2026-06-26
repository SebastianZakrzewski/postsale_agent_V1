/**
 * Preliminary benchmark: template match + note selection on Bitrix stage cohorts.
 *
 * Usage:
 *   npx ts-node scripts/benchmark-stage-deals.ts
 *   npx ts-node scripts/benchmark-stage-deals.ts --stage=EXECUTING
 *   npx ts-node scripts/benchmark-stage-deals.ts --save=scripts/.stage-benchmark.json
 *
 * Requires: BITRIX_WEBHOOK_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../src/domains/bitrix/config/bitrix-field-mapping';
import { parseBitrixDeal } from '../src/domains/bitrix/parsers/bitrix-deal.parser';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../src/domains/template-matching/services/template-note-selection.service';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { BitrixReadAdapter } from '../src/integrations/bitrix/bitrix-read.adapter';
import { SupabaseCarTemplateRepository } from '../src/integrations/supabase/supabase-car-template.repository';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';

const STAGE_COHORTS = [
  { statusId: 'NEW', label: 'Czeka na opłatę' },
  { statusId: 'PREPARATION', label: 'Opłacone' },
  { statusId: 'UC_ZQ68O2', label: 'Deale do dodania' },
  { statusId: 'PREPAYMENT_INVOICE', label: 'Oczekiwanie na Zdjęcia' },
  { statusId: 'EXECUTING', label: 'Wysłane do Realizacji' },
  { statusId: 'FINAL_INVOICE', label: 'Faktura końcowa' },
] as const;

interface BitrixListResponse {
  result?: Array<{ ID: string }>;
  next?: number;
  total?: number;
}

interface DealAuditRow {
  dealId: string;
  stageId: string;
  parseOk: boolean;
  parseReason?: string;
  templateStatus: 'SKIPPED' | 'MATCHED' | 'NOT_FOUND' | 'AMBIGUOUS';
  templateReason?: string;
  carTemplateId?: string;
  notesOk: boolean;
  notesReason?: string;
  noteCount?: number;
}

interface StageSummary {
  statusId: string;
  label: string;
  totalDeals: number;
  parseable: number;
  templateMatched: number;
  templateNotFound: number;
  templateAmbiguous: number;
  notesOk: number;
  notesFailed: number;
  templateHitRate: number;
  notesHitRate: number;
  endToEndHitRate: number;
  topFailureReasons: Record<string, number>;
}

function parseArgs(argv: string[]): {
  stageFilter?: string;
  savePath?: string;
  limitPerStage?: number;
} {
  let stageFilter: string | undefined;
  let savePath: string | undefined;
  let limitPerStage: number | undefined;

  for (const arg of argv) {
    if (arg.startsWith('--stage=')) {
      stageFilter = arg.slice('--stage='.length);
    } else if (arg.startsWith('--save=')) {
      savePath = arg.slice('--save='.length);
    } else if (arg.startsWith('--limit=')) {
      limitPerStage = Number(arg.slice('--limit='.length));
    }
  }

  return { stageFilter, savePath, limitPerStage };
}

async function bitrixListDealIds(
  webhookUrl: string,
  stageId: string,
  limit?: number,
): Promise<string[]> {
  const base = webhookUrl.replace(/\/$/, '');
  const ids: string[] = [];
  let start = 0;

  while (true) {
    const response = await fetch(`${base}/crm.deal.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { STAGE_ID: stageId, CATEGORY_ID: 0 },
        select: ['ID'],
        start,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`crm.deal.list HTTP ${response.status} for ${stageId}`);
    }

    const body = (await response.json()) as BitrixListResponse;
    const batch = body.result ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      ids.push(String(row.ID));
      if (limit != null && ids.length >= limit) {
        return ids;
      }
    }

    if (body.next == null) {
      break;
    }
    start = body.next;
  }

  return ids;
}

function summarizeStage(
  statusId: string,
  label: string,
  rows: DealAuditRow[],
): StageSummary {
  const parseable = rows.filter((row) => row.parseOk);
  const templateMatched = parseable.filter(
    (row) => row.templateStatus === 'MATCHED',
  );
  const templateNotFound = parseable.filter(
    (row) => row.templateStatus === 'NOT_FOUND',
  );
  const templateAmbiguous = parseable.filter(
    (row) => row.templateStatus === 'AMBIGUOUS',
  );
  const notesOk = parseable.filter((row) => row.notesOk);
  const notesFailed = templateMatched.filter((row) => !row.notesOk);

  const topFailureReasons: Record<string, number> = {};
  for (const row of parseable) {
    if (row.templateStatus !== 'MATCHED') {
      const key = `template:${row.templateReason ?? row.templateStatus}`;
      topFailureReasons[key] = (topFailureReasons[key] ?? 0) + 1;
    } else if (!row.notesOk) {
      const key = `notes:${row.notesReason ?? 'unknown'}`;
      topFailureReasons[key] = (topFailureReasons[key] ?? 0) + 1;
    }
  }

  const parseableCount = parseable.length;
  const hit = (n: number) =>
    parseableCount > 0 ? Math.round((n / parseableCount) * 1000) / 10 : 0;

  return {
    statusId,
    label,
    totalDeals: rows.length,
    parseable: parseableCount,
    templateMatched: templateMatched.length,
    templateNotFound: templateNotFound.length,
    templateAmbiguous: templateAmbiguous.length,
    notesOk: notesOk.length,
    notesFailed: notesFailed.length,
    templateHitRate: hit(templateMatched.length),
    notesHitRate: hit(notesOk.length),
    endToEndHitRate: hit(notesOk.length),
    topFailureReasons,
  };
}

function printSummary(summaries: StageSummary[]): void {
  console.log('\n=== Stage benchmark (parseable deals) ===\n');
  console.log(
    'Stage'.padEnd(18),
    'Parse'.padStart(6),
    'Tmpl'.padStart(6),
    'N/F'.padStart(5),
    'Amb'.padStart(5),
    'Notes'.padStart(6),
    'T%'.padStart(7),
    'E2E%'.padStart(7),
  );
  console.log('-'.repeat(68));

  for (const s of summaries) {
    console.log(
      s.statusId.padEnd(18),
      String(s.parseable).padStart(6),
      String(s.templateMatched).padStart(6),
      String(s.templateNotFound).padStart(5),
      String(s.templateAmbiguous).padStart(5),
      String(s.notesOk).padStart(6),
      `${s.templateHitRate}%`.padStart(7),
      `${s.endToEndHitRate}%`.padStart(7),
    );
  }

  const templateMean =
    summaries.reduce((sum, s) => sum + s.templateHitRate, 0) / summaries.length;
  const e2eMean =
    summaries.reduce((sum, s) => sum + s.endToEndHitRate, 0) / summaries.length;
  const pooledParseable = summaries.reduce((sum, s) => sum + s.parseable, 0);
  const pooledMatched = summaries.reduce(
    (sum, s) => sum + s.templateMatched,
    0,
  );
  const pooledNotesOk = summaries.reduce((sum, s) => sum + s.notesOk, 0);

  console.log('-'.repeat(68));
  console.log(
    `Arithmetic mean template: ${templateMean.toFixed(1)}% | E2E: ${e2eMean.toFixed(1)}%`,
  );
  console.log(
    `Pooled template: ${pooledMatched}/${pooledParseable} (${pooledParseable > 0 ? ((pooledMatched / pooledParseable) * 100).toFixed(1) : 0}%)`,
  );
  console.log(
    `Pooled E2E: ${pooledNotesOk}/${pooledParseable} (${pooledParseable > 0 ? ((pooledNotesOk / pooledParseable) * 100).toFixed(1) : 0}%)`,
  );

  console.log('\nTop failure reasons per stage:');
  for (const s of summaries) {
    const reasons = Object.entries(s.topFailureReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (reasons.length === 0) {
      continue;
    }
    console.log(`  ${s.statusId}:`, reasons.map(([k, v]) => `${k}(${v})`).join(', '));
  }
}

async function main(): Promise<void> {
  loadProjectDotEnv();
  const { stageFilter, savePath, limitPerStage } = parseArgs(
    process.argv.slice(2),
  );

  const webhookUrl = process.env.BITRIX_WEBHOOK_URL;
  if (!webhookUrl?.trim()) {
    throw new Error('BITRIX_WEBHOOK_URL is required');
  }

  const bitrix = new BitrixReadAdapter(webhookUrl);
  const carTemplateRepo = new SupabaseCarTemplateRepository(createSupabaseClient());
  const matchingService = new TemplateMatchingService(carTemplateRepo);
  const noteService = new TemplateNoteSelectionService();

  const cohorts = stageFilter
    ? (STAGE_COHORTS.filter((c) => c.statusId === stageFilter).length > 0
        ? STAGE_COHORTS.filter((c) => c.statusId === stageFilter)
        : [{ statusId: stageFilter, label: stageFilter }])
    : [...STAGE_COHORTS];

  const auditedAt = new Date().toISOString();
  const allRows: DealAuditRow[] = [];
  const summaries: StageSummary[] = [];

  for (const cohort of cohorts) {
    console.error(`\n[${cohort.statusId}] listing deals...`);
    const dealIds = await bitrixListDealIds(
      webhookUrl,
      cohort.statusId,
      limitPerStage,
    );
    console.error(`[${cohort.statusId}] auditing ${dealIds.length} deals...`);

    const stageRows: DealAuditRow[] = [];

    for (const dealId of dealIds) {
      const payload = await bitrix.readDeal(dealId);
      const parsed = parseBitrixDeal(payload, DEFAULT_BITRIX_FIELD_MAPPING);

      if (!parsed.ok) {
        stageRows.push({
          dealId,
          stageId: cohort.statusId,
          parseOk: false,
          parseReason: parsed.reason,
          templateStatus: 'SKIPPED',
          notesOk: false,
        });
        continue;
      }

      const stage1 = await matchingService.matchDealContext(parsed.dealContext);

      if (stage1.status === 'NOT_FOUND') {
        stageRows.push({
          dealId,
          stageId: cohort.statusId,
          parseOk: true,
          templateStatus: 'NOT_FOUND',
          templateReason: stage1.escalationReason,
          notesOk: false,
        });
        continue;
      }

      if (stage1.status === 'AMBIGUOUS') {
        stageRows.push({
          dealId,
          stageId: cohort.statusId,
          parseOk: true,
          templateStatus: 'AMBIGUOUS',
          templateReason: stage1.escalationReason,
          notesOk: false,
        });
        continue;
      }

      const noteResult = noteService.selectNotes({
        carTemplate: stage1.carTemplate,
        product: parsed.dealContext.product,
        productEnumId: parsed.dealContext.productEnumId,
        setVariantId: parsed.dealContext.setVariantId,
        resolvedBodyProfile: stage1.resolvedBodyProfile,
      });

      stageRows.push({
        dealId,
        stageId: cohort.statusId,
        parseOk: true,
        templateStatus: 'MATCHED',
        carTemplateId: stage1.carTemplate.id,
        notesOk: !noteResult.requiresEscalation,
        notesReason: noteResult.escalationReason,
        noteCount: noteResult.notes.length,
      });
    }

    allRows.push(...stageRows);
    summaries.push(summarizeStage(cohort.statusId, cohort.label, stageRows));
  }

  printSummary(summaries);

  const artifact = {
    auditedAt,
    matcher: 'wide-car_templates-v2',
    stages: summaries,
    deals: allRows,
  };

  const outputPath =
    savePath ??
    path.join('scripts', `.stage-benchmark-${auditedAt.slice(0, 10)}.json`);

  if (savePath || true) {
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2), 'utf8');
    console.error(`\nArtifact saved: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
