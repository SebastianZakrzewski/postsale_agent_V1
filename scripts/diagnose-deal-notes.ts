import { DEFAULT_BITRIX_FIELD_MAPPING } from '../src/domains/bitrix/config/bitrix-field-mapping';
import { parseBitrixDeal } from '../src/domains/bitrix/parsers/bitrix-deal.parser';
import { resolveSetVariantParts } from '../src/domains/template-matching/config/bitrix-set-variant-parts';
import { resolveProductLine } from '../src/domains/template-matching/config/bitrix-product-line';
import {
  readNoteText,
  resolveNoteColumnForPart,
} from '../src/domains/template-matching/config/note-column-resolver';
import { TemplateMatchingService } from '../src/domains/template-matching/services/template-matching.service';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { BitrixReadAdapter } from '../src/integrations/bitrix/bitrix-read.adapter';
import { SupabaseCarTemplateRepository } from '../src/integrations/supabase/supabase-car-template.repository';
import { createSupabaseClient } from '../src/integrations/supabase/supabase.client';

async function diagnose(dealId: string): Promise<void> {
  const webhookUrl = process.env.BITRIX_WEBHOOK_URL!;
  const bitrix = new BitrixReadAdapter(webhookUrl);
  const matching = new TemplateMatchingService(
    new SupabaseCarTemplateRepository(createSupabaseClient()),
  );

  const payload = await bitrix.readDeal(dealId);
  const parsed = parseBitrixDeal(payload, DEFAULT_BITRIX_FIELD_MAPPING);
  if (!parsed.ok) {
    console.log(dealId, 'parse failed', parsed);
    return;
  }

  const dc = parsed.dealContext;
  const stage1 = await matching.matchDealContext(dc);
  const productLine = resolveProductLine({
    product: dc.product,
    productEnumId: dc.productEnumId,
  });
  const variant = resolveSetVariantParts(dc.setVariantId);

  console.log('\n=== Deal', dealId, '===');
  console.log('vehicle:', {
    brand: dc.brand,
    model: dc.model,
    bodyType: dc.bodyType,
    generation: dc.generation,
  });
  console.log('product:', dc.product, 'enum:', dc.productEnumId);
  console.log('setVariant:', dc.setVariantId, dc.setVariantLabel);
  console.log('productLine:', productLine.line);
  console.log('variant parts:', variant.parts);
  console.log('stage1:', stage1.status);

  if (stage1.status !== 'MATCHED') {
    if (stage1.status === 'NOT_FOUND') {
      console.log('reason:', stage1.escalationReason);
    }
    return;
  }

  console.log('template:', {
    id: stage1.carTemplate.id,
    brand: stage1.carTemplate.brand,
    model: stage1.carTemplate.model,
    generation: stage1.carTemplate.generation,
    body_type_1: stage1.carTemplate.body_type_1,
  });

  for (const part of variant.parts) {
    const column = resolveNoteColumnForPart(
      part,
      productLine.line!,
      stage1.resolvedBodyProfile,
    );
    const text = readNoteText(stage1.carTemplate, column);
    console.log(
      `  part ${part} -> ${column}:`,
      text ? `"${text.slice(0, 60)}..."` : '(EMPTY)',
    );
  }
}

async function main(): Promise<void> {
  loadProjectDotEnv();
  for (const id of process.argv.slice(2)) {
    await diagnose(id);
  }
}

main().catch(console.error);
