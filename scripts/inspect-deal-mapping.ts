import { DEFAULT_BITRIX_FIELD_MAPPING } from '../src/domains/bitrix/config/bitrix-field-mapping';
import { parseBitrixDeal } from '../src/domains/bitrix/parsers/bitrix-deal.parser';
import { resolveSetVariantParts } from '../src/domains/template-matching/config/bitrix-set-variant-parts';
import { resolveProductLine } from '../src/domains/template-matching/config/bitrix-product-line';
import {
  readNoteText,
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../src/domains/template-matching/config/note-column-resolver';
import { resolveBodyTypeProfile } from '../src/domains/template-matching/config/body-type-compatibility';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../src/domains/template-matching/services/template-note-selection.service';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import {
  normalizeBodyType,
  normalizeGeneration,
  normalizeIdentifier,
} from '../src/lib/normalization';
import { BitrixReadAdapter } from '../src/integrations/bitrix/bitrix-read.adapter';
import { SupabaseCarTemplateRepository } from '../src/integrations/supabase/supabase-car-template.repository';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';
import { CAR_TEMPLATE_NOTE_COLUMNS } from '../src/lib/normalization/evamats-slug-mappings';

async function main(): Promise<void> {
  loadProjectDotEnv();
  const dealId = process.argv[2] ?? '32030';
  const bitrix = new BitrixReadAdapter(process.env.BITRIX_WEBHOOK_URL!);
  const matching = new TemplateMatchingService(
    new SupabaseCarTemplateRepository(createSupabaseClient()),
  );
  const notes = new TemplateNoteSelectionService();

  const payload = await bitrix.readDeal(dealId);
  const parsed = parseBitrixDeal(payload, DEFAULT_BITRIX_FIELD_MAPPING);
  if (!parsed.ok) {
    console.log('parse failed', parsed);
    return;
  }

  const dc = parsed.dealContext;
  console.log('=== Bitrix raw (vehicle + product) ===');
  console.log(JSON.stringify(dc, null, 2));

  console.log('\n=== Normalized keys ===');
  console.log({
    brand: normalizeIdentifier(dc.brand),
    model: normalizeIdentifier(dc.model),
    bodyType: normalizeBodyType(dc.bodyType),
    generation: normalizeGeneration(dc.generation),
  });

  const stage1 = await matching.matchDealContext(dc);
  const productLine = resolveProductLine({
    product: dc.product,
    productEnumId: dc.productEnumId,
  });
  const variant = resolveSetVariantParts(dc.setVariantId);

  console.log('\n=== Stage 2 mapping ===');
  console.log('productLine:', productLine);
  console.log('setVariant parts:', variant.parts);

  if (stage1.status !== 'MATCHED') {
    console.log('stage1:', stage1);
    return;
  }

  const body = stage1.resolvedBodyProfile;
  console.log('resolvedBodyProfile:', body);

  console.log('\n=== Column mapping + text ===');
  for (const part of variant.parts) {
    const resolvedColumn = resolveNoteColumnForPart(part, productLine.line!, body);
    const { text, column } = readNoteTextForPart(
      stage1.carTemplate,
      part,
      resolvedColumn,
    );
    console.log(`\n[${part}] -> ${resolvedColumn}${column !== resolvedColumn ? ` (fallback: ${column})` : ''}`);
    console.log(text ?? '(puste)');
  }

  const selection = notes.selectNotes({
    carTemplate: stage1.carTemplate,
    product: dc.product,
    productEnumId: dc.productEnumId,
    setVariantId: dc.setVariantId,
    resolvedBodyProfile: body,
  });

  console.log('\n=== selectedNotes (workflow output) ===');
  console.log(JSON.stringify(selection, null, 2));

  console.log('\n=== Wszystkie notes_* w szablonie (niepuste) ===');
  for (const col of CAR_TEMPLATE_NOTE_COLUMNS) {
    const text = readNoteText(stage1.carTemplate, col);
    if (text) {
      console.log(`\n${col}:`);
      console.log(text);
    }
  }
}

main().catch(console.error);
