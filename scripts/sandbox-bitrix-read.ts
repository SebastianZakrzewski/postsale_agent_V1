/**
 * Live sandbox: Bitrix deal read + DealContext mapping only (no workflow side effects).
 *
 * Usage:
 *   npm run sandbox:bitrix-read -- 33950
 *
 * Required environment variables (from .env or shell):
 *   BITRIX_WEBHOOK_URL
 * Optional:
 *   BITRIX_DEAL_FIELD_MAP — JSON override; defaults to EVAPREMIUM mapping in code
 */
import { parseBitrixDeal } from '../src/domains/bitrix/parsers/bitrix-deal.parser';
import {
  DEFAULT_BITRIX_FIELD_MAPPING,
  resolveBitrixFieldMapping,
} from '../src/domains/bitrix/config/bitrix-field-mapping';
import { BitrixReadAdapter } from '../src/integrations/bitrix/bitrix-read.adapter';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';

function parseDealId(argv: string[]): string | null {
  const positional = argv.find((arg) => /^\d+$/.test(arg));
  if (positional) {
    return positional;
  }

  const flagged = argv.find((arg) => arg.startsWith('--deal-id='));
  return flagged?.slice('--deal-id='.length) ?? null;
}

async function main(): Promise<void> {
  loadProjectDotEnv();

  const dealId = parseDealId(process.argv.slice(2));
  if (!dealId) {
    console.error('Usage: npm run sandbox:bitrix-read -- <dealId>');
    console.error('   or: npm run sandbox:bitrix-read -- --deal-id=33950');
    process.exit(1);
  }

  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.error('Missing BITRIX_WEBHOOK_URL in environment or .env');
    process.exit(1);
  }

  const fieldMapping = resolveBitrixFieldMapping();
  const adapter = new BitrixReadAdapter(webhookUrl);

  console.log(
    JSON.stringify(
      {
        step: 'bitrix_read_start',
        dealId,
        fieldMapping,
      },
      null,
      2,
    ),
  );

  const payload = await adapter.readDeal(dealId);
  const parseResult = parseBitrixDeal(payload, fieldMapping);

  if (!parseResult.ok) {
    console.log(
      JSON.stringify(
        {
          step: 'deal_context_parse_failed',
          dealId: payload.id,
          stageId: payload.stageId ?? null,
          reason: parseResult.reason,
          missingFields: parseResult.missingFields,
          mappedFieldKeys: fieldMapping,
          rawFieldSample: Object.fromEntries(
            Object.values(DEFAULT_BITRIX_FIELD_MAPPING).map((key) => [
              key,
              payload.fields?.[key] ?? null,
            ]),
          ),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        step: 'deal_context_ready',
        dealId: payload.id,
        stageId: payload.stageId ?? null,
        dealContext: parseResult.dealContext,
        fieldMapping,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ step: 'sandbox_error', message }, null, 2));
  process.exit(1);
});
