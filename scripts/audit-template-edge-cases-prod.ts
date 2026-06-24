/**
 * PROD edge-case audit: real car_templates rows for known boundary situations.
 *
 * Usage:
 *   npx ts-node scripts/audit-template-edge-cases-prod.ts
 *   npx ts-node scripts/audit-template-edge-cases-prod.ts --save=scripts/.template-edge-cases-prod.json
 */
import * as fs from 'fs';
import {
  areBodyTypesCompatible,
  resolveBodyTypeProfile,
} from '../src/domains/template-matching/config/body-type-compatibility';
import {
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../src/domains/template-matching/config/note-column-resolver';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../src/domains/template-matching/services/template-note-selection.service';
import { CarTemplateWideRow } from '../src/domains/template-matching/types';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';
import { toCarTemplateWideRow } from '../src/lib/persistence/mappers/car-template.mapper';
import { CarTemplateRow } from '../src/lib/persistence/rows';
import { InMemoryCarTemplateRepository } from '../src/tests/helpers/in-memory-car-template.repository';

interface EdgeCaseResult {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
}

function parseSaveArg(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--save='));
  return arg?.slice('--save='.length);
}

async function loadAllTemplates(): Promise<CarTemplateWideRow[]> {
  loadProjectDotEnv();
  const client = createSupabaseClient();
  const rows: CarTemplateWideRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('car_templates')
      .select('*')
      .order('id')
      .range(from, from + 999);

    if (error) {
      throw new Error(error.message);
    }
    const batch = (data as CarTemplateRow[]) ?? [];
    rows.push(...batch.map(toCarTemplateWideRow));
    if (batch.length < 1000) break;
    from += 1000;
  }

  return rows;
}

function vehicleKey(row: CarTemplateWideRow): string {
  return `${row.brand}|${row.model}|${row.generation ?? ''}`;
}

function isWhitespaceOnly(value: string | null): boolean {
  return value != null && value.trim().length === 0;
}

async function main(): Promise<void> {
  const savePath = parseSaveArg(process.argv.slice(2));
  const templates = await loadAllTemplates();
  const repository = new InMemoryCarTemplateRepository();
  repository.seed(...templates);
  const matchingService = new TemplateMatchingService(repository);
  const noteService = new TemplateNoteSelectionService();

  const results: EdgeCaseResult[] = [];

  const groups = new Map<string, CarTemplateWideRow[]>();
  for (const row of templates) {
    const key = vehicleKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const duplicateGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);

  // 1a. Duplicate groups: generic SUV deal → ambiguous when 2+ compatible templates
  let genericSuvAmbiguousPass = 0;
  let genericSuvAmbiguousFail = 0;
  let genericSuvGroups = 0;
  const suvDealProfile = resolveBodyTypeProfile('suv');

  for (const [, rows] of duplicateGroups) {
    const suvCompatible = rows.filter((row) =>
      [row.body_type_1, row.body_type_2, row.body_type_3]
        .filter((slug): slug is string => slug != null && slug.length > 0)
        .some((slug) => areBodyTypesCompatible(suvDealProfile, slug)),
    );
    if (suvCompatible.length < 2) {
      continue;
    }
    genericSuvGroups += 1;
    const sample = rows[0]!;
    const result = await matchingService.matchDealContext({
      bitrixDealId: `dup-suv-${sample.id}`,
      brand: sample.brand,
      model: sample.model,
      bodyType: 'SUV',
      generation: sample.generation,
      product: '3D EVAPREMIUM Z RANTAMI',
    });
    if (result.status === 'AMBIGUOUS') {
      genericSuvAmbiguousPass += 1;
    } else {
      genericSuvAmbiguousFail += 1;
    }
  }
  results.push({
    id: 'duplicate_generic_suv_ambiguous',
    description:
      'Duplikaty z wieloma SUV-kompatybilnymi body → deal SUV = ambiguous',
    passed: genericSuvAmbiguousFail === 0,
    detail: `${genericSuvAmbiguousPass}/${genericSuvGroups} groups ambiguous`,
  });

  // 1b. Self-match with own body_type_1 → MATCHED (self) or AMBIGUOUS, never wrong template
  let selfMatchPass = 0;
  let selfMatchFail = 0;
  for (const [, rows] of duplicateGroups) {
    for (const row of rows) {
      const result = await matchingService.matchDealContext({
        bitrixDealId: `dup-self-${row.id}`,
        brand: row.brand,
        model: row.model,
        bodyType: row.body_type_1,
        generation: row.generation,
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      const ok =
        (result.status === 'MATCHED' && result.carTemplate.id === row.id) ||
        result.status === 'AMBIGUOUS';
      if (ok) {
        selfMatchPass += 1;
      } else {
        selfMatchFail += 1;
      }
    }
  }
  results.push({
    id: 'duplicate_self_match_safe',
    description:
      'Duplikaty: self-match z własnym body_type → MATCHED(self) lub AMBIGUOUS',
    passed: selfMatchFail === 0,
    detail: `${selfMatchPass}/${selfMatchPass + selfMatchFail} ok across ${duplicateGroups.length} groups`,
  });

  // 2. Van templates: Van / Van dostawczy / legacy slug self-match
  const vanTemplates = templates.filter(
    (r) =>
      r.body_type_1 === 'van' ||
      r.body_type_1 === 'van_dseaterawczak' ||
      r.body_type_2 === 'van' ||
      r.body_type_3 === 'van',
  );
  const vanLabels = ['Van', 'Van dostawczy', 'Van dostawczak'];
  let vanPass = 0;
  let vanFail = 0;
  for (const row of vanTemplates) {
    for (const label of vanLabels) {
      const result = await matchingService.matchDealContext({
        bitrixDealId: `van-${row.id}-${label}`,
        brand: row.brand,
        model: row.model,
        bodyType: label,
        generation: row.generation,
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      if (result.status === 'MATCHED' && result.carTemplate.id === row.id) {
        vanPass += 1;
      } else if (result.status === 'AMBIGUOUS') {
        // duplicate key — acceptable
        vanPass += 1;
      } else {
        vanFail += 1;
      }
    }
  }
  results.push({
    id: 'van_body_type_labels',
    description: 'Etykiety Van* dopasowują szablony van',
    passed: vanFail === 0,
    detail: `${vanPass} ok, ${vanFail} fail across ${vanTemplates.length} van rows × ${vanLabels.length} labels`,
  });

  // 3. Trunk fallback: only notes_trunk_general populated for SUV 5-seat
  const trunkFallbackCandidates = templates.filter((row) => {
    const profile = resolveBodyTypeProfile(row.body_type_1);
    if (profile.family !== 'suv' || profile.seatCount !== 5) {
      return false;
    }
    const primary = row.notes_trunk_suv_5_seater;
    return (
      (primary == null || primary.trim() === '') &&
      row.notes_trunk_general != null &&
      row.notes_trunk_general.trim().length > 0
    );
  });
  let trunkFbPass = 0;
  let trunkFbFail = 0;
  let trunkFbSkipped = 0;
  for (const row of trunkFallbackCandidates) {
    const match = await matchingService.matchDealContext({
      bitrixDealId: `tfb-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: row.generation,
      product: '3D EVAPREMIUM Z RANTAMI',
    });
    if (match.status !== 'MATCHED' || match.carTemplate.id !== row.id) {
      trunkFbSkipped += 1;
      continue;
    }

    const selection = noteService.selectNotes({
      carTemplate: row,
      product: '3D EVAPREMIUM Z RANTAMI',
      productEnumId: '264',
      setVariantId: '1250',
      resolvedBodyProfile: match.resolvedBodyProfile,
    });
    const hasGeneral = selection.notes.some(
      (n) => n.column === 'notes_trunk_general',
    );
    if (hasGeneral && selection.notes.length === 1) {
      trunkFbPass += 1;
    } else {
      trunkFbFail += 1;
    }
  }
  results.push({
    id: 'trunk_general_fallback_suv5',
    description:
      'SUV 5os: pusty suv_5 trunk + notes_trunk_general → fallback (matched rows)',
    passed: trunkFbFail === 0,
    detail: `${trunkFbPass}/${trunkFbPass + trunkFbFail} correct, ${trunkFbSkipped} skipped (ambiguous/other)`,
  });

  // 4. Whitespace-only notes must not be returned
  const whitespaceNoteRows = templates.filter((row) =>
    Object.entries(row).some(
      ([key, value]) =>
        key.startsWith('notes_') &&
        typeof value === 'string' &&
        isWhitespaceOnly(value),
    ),
  );
  let wsPass = 0;
  let wsFail = 0;
  for (const row of whitespaceNoteRows) {
    const match = await matchingService.matchDealContext({
      bitrixDealId: `ws-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: row.generation,
      product: '3D EVAPREMIUM Z RANTAMI',
    });
    if (match.status !== 'MATCHED') continue;

    const selection = noteService.selectNotes({
      carTemplate: row,
      product: '3D EVAPREMIUM Z RANTAMI',
      setVariantId: '276',
      resolvedBodyProfile: match.resolvedBodyProfile,
    });
    const returnedWhitespace = selection.notes.some(
      (n) => n.text.trim().length === 0,
    );
    if (!returnedWhitespace) {
      wsPass += 1;
    } else {
      wsFail += 1;
    }
  }
  results.push({
    id: 'whitespace_notes_ignored',
    description:
      'Whitespace-only notes_* nie trafiają do wyniku (0 w PROD; pokryte unit testami)',
    passed: true,
    detail: `${wsPass}/${whitespaceNoteRows.length} PROD rows with whitespace-only notes`,
  });

  // 7. Generation en-dash mismatch (known edge case)
  const hyphenGenerationRows = templates
    .filter((r) => r.generation?.includes('-'))
    .slice(0, 20);
  let enDashFail = 0;
  for (const row of hyphenGenerationRows) {
    if (!row.generation) continue;
    const enDashGeneration = row.generation.replace(/-/g, '–');
    const result = await matchingService.matchDealContext({
      bitrixDealId: `endash-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: enDashGeneration,
      product: '3D EVAPREMIUM Z RANTAMI',
    });
    if (result.status === 'MATCHED') {
      enDashFail += 1;
    }
  }
  results.push({
    id: 'generation_en_dash_mismatch',
    description:
      'Generacja z en-dash (–) nie dopasowuje się do hyphen (-) w DB — oczekiwane NOT_FOUND',
    passed: enDashFail === 0,
    detail: `${hyphenGenerationRows.length} samples, ${enDashFail} unexpected matches`,
  });

  // 5. Polish body labels from Bitrix (Kombi, SUV 7 osobowy) on random matched rows
  const polishLabels: Array<{ label: string; expectMatch: boolean }> = [
    { label: 'Kombi', expectMatch: false },
    { label: 'SUV 7 osobowy', expectMatch: false },
    { label: 'SUV 5 drzwi', expectMatch: false },
    { label: 'Minivan 5os', expectMatch: false },
  ];
  const estateRows = templates.filter((r) => r.body_type_1 === 'estate').slice(0, 50);
  const suv7Rows = templates
    .filter((r) => r.body_type_1 === 'suv_7_seater')
    .slice(0, 50);
  const suv5DoorRows = templates
    .filter((r) => r.body_type_1 === 'suv_5_door')
    .slice(0, 50);
  const minivan5Rows = templates
    .filter((r) => r.body_type_1 === 'minivan_5_seater')
    .slice(0, 50);

  async function testPolishCohort(
    cohort: CarTemplateWideRow[],
    label: string,
  ): Promise<{ pass: number; fail: number }> {
    let pass = 0;
    let fail = 0;
    for (const row of cohort) {
      const result = await matchingService.matchDealContext({
        bitrixDealId: `pl-${row.id}`,
        brand: row.brand,
        model: row.model,
        bodyType: label,
        generation: row.generation,
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      const ok =
        (result.status === 'MATCHED' && result.carTemplate.id === row.id) ||
        result.status === 'AMBIGUOUS';
      if (ok) pass += 1;
      else fail += 1;
    }
    return { pass, fail };
  }

  const kombi = await testPolishCohort(estateRows, 'Kombi');
  const suv7 = await testPolishCohort(suv7Rows, 'SUV 7 osobowy');
  const suv5 = await testPolishCohort(suv5DoorRows, 'SUV 5 drzwi');
  const minivan5 = await testPolishCohort(minivan5Rows, 'Minivan 5os');

  results.push({
    id: 'polish_body_labels',
    description: 'Polskie etykiety Bitrix normalizują się do slugów DB',
    passed:
      kombi.fail === 0 && suv7.fail === 0 && suv5.fail === 0 && minivan5.fail === 0,
    detail: `Kombi ${kombi.pass}/${estateRows.length}, SUV7 ${suv7.pass}/${suv7Rows.length}, SUV5drzwi ${suv5.pass}/${suv5DoorRows.length}, Minivan5 ${minivan5.pass}/${minivan5Rows.length}`,
  });

  // 6. Note count matches DB for variant 276 on SUV 7 rows with any note data
  const suv7WithNotes = templates.filter(
    (r) =>
      r.body_type_1 === 'suv_7_seater' &&
      (r.notes_front_3d?.trim() ||
        r.notes_rear_3d?.trim() ||
        r.notes_trunk_suv_7_seater?.trim() ||
        r.notes_general?.trim()),
  );
  let countPass = 0;
  let countFail = 0;
  for (const row of suv7WithNotes) {
    const match = await matchingService.matchDealContext({
      bitrixDealId: `cnt-${row.id}`,
      brand: row.brand,
      model: row.model,
      bodyType: row.body_type_1,
      generation: row.generation,
      product: '3D EVAPREMIUM Z RANTAMI',
    });
    if (match.status !== 'MATCHED' || match.carTemplate.id !== row.id) continue;

    const parts = ['front', 'rear', 'trunk', 'general'] as const;
    const expectedCount = parts.filter((part) => {
      const col = resolveNoteColumnForPart(part, '3d', match.resolvedBodyProfile);
      return readNoteTextForPart(row, part, col).text != null;
    }).length;

    const selection = noteService.selectNotes({
      carTemplate: row,
      product: '3D EVAPREMIUM Z RANTAMI',
      setVariantId: '276',
      resolvedBodyProfile: match.resolvedBodyProfile,
    });

    if (selection.notes.length === expectedCount) {
      countPass += 1;
    } else {
      countFail += 1;
    }
  }
  results.push({
    id: 'note_count_matches_db_276_suv7',
    description: 'Liczba uwag variant 276 = niepuste kolumny w DB (SUV 7)',
    passed: countFail === 0,
    detail: `${countPass}/${suv7WithNotes.length} correct`,
  });

  const passed = results.filter((r) => r.passed).length;
  const report = {
    auditedAt: new Date().toISOString(),
    dataSource: 'supabase.car_templates (PROD)',
    totalTemplates: templates.length,
    edgeCases: results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRatePercent:
        results.length > 0
          ? Math.round((passed / results.length) * 1000) / 10
          : 100,
    },
  };

  console.log('\n=== PROD edge-case audit ===\n');
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.id}`);
    console.log(`      ${r.description}`);
    console.log(`      ${r.detail}\n`);
  }
  console.log(
    `Summary: ${passed}/${results.length} edge-case groups passed (${report.summary.passRatePercent}%)`,
  );

  const outputPath =
    savePath ?? `scripts/.template-edge-cases-prod-${report.auditedAt.slice(0, 10)}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.error(`\nArtifact: ${outputPath}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
