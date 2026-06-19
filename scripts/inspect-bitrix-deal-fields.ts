/**
 * Inspect Bitrix deal fields + userfield enum definitions for DealContext mapping.
 *
 * Usage:
 *   npm run inspect:bitrix-deal -- 34668
 */
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../src/domains/bitrix/config/bitrix-field-mapping';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';

const PRODUCT_ENUM_FIELD = 'UF_CRM_1757024835301';
const LEGACY_COMBINED_FIELD = 'UF_CRM_1757178018809';

interface UserFieldListItem {
  FIELD_NAME?: string;
  EDIT_FORM_LABEL?: Record<string, string> | string;
  USER_TYPE_ID?: string;
  LIST?: Array<{ ID?: string; VALUE?: string }>;
}

interface DealGetResponse {
  result?: Record<string, unknown>;
}

interface UserFieldListResponse {
  result?: UserFieldListItem[];
}

function parseDealId(argv: string[]): string | null {
  const positional = argv.find((arg) => /^\d+$/.test(arg));
  if (positional) {
    return positional;
  }

  const flagged = argv.find((arg) => arg.startsWith('--deal-id='));
  return flagged?.slice('--deal-id='.length) ?? null;
}

function labelOf(field: UserFieldListItem): string {
  const raw = field.EDIT_FORM_LABEL;
  if (typeof raw === 'string') {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    return raw.pl ?? raw.en ?? Object.values(raw)[0] ?? field.FIELD_NAME ?? '';
  }
  return field.FIELD_NAME ?? '';
}

function enumLabel(
  field: UserFieldListItem | undefined,
  id: string | null | undefined,
): string | null {
  if (!field?.LIST || id == null || id === '') {
    return null;
  }

  const match = field.LIST.find((item) => String(item.ID) === String(id));
  return match?.VALUE?.trim() || null;
}

async function bitrixGet<T>(
  webhookUrl: string,
  method: string,
  query?: Record<string, string>,
): Promise<T> {
  const base = webhookUrl.replace(/\/$/, '');
  const params = new URLSearchParams(query ?? {});
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${base}/${method}${suffix}`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`${method} failed: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function main(): Promise<void> {
  loadProjectDotEnv();

  const dealId = parseDealId(process.argv.slice(2));
  if (!dealId) {
    console.error('Usage: npm run inspect:bitrix-deal -- <dealId>');
    process.exit(1);
  }

  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.error('Missing BITRIX_WEBHOOK_URL');
    process.exit(1);
  }

  const trackedFields = [
    ...Object.entries(DEFAULT_BITRIX_FIELD_MAPPING).map(([dealContextKey, fieldName]) => ({
      dealContextKey,
      fieldName,
    })),
    { dealContextKey: 'product_enum', fieldName: PRODUCT_ENUM_FIELD },
    { dealContextKey: 'legacy_combined', fieldName: LEGACY_COMBINED_FIELD },
  ];

  const fieldNames = trackedFields.map((item) => item.fieldName);

  const [dealBody, userFieldBody] = await Promise.all([
    bitrixGet<DealGetResponse>(webhookUrl, 'crm.deal.get', { id: dealId }),
    bitrixGet<UserFieldListResponse>(webhookUrl, 'crm.deal.userfield.list'),
  ]);

  const deal = dealBody.result;
  if (!deal) {
    console.error('Empty deal result');
    process.exit(1);
  }

  const userFields = userFieldBody.result ?? [];
  const userFieldByName = new Map(
    userFields
      .filter((field) => field.FIELD_NAME)
      .map((field) => [field.FIELD_NAME as string, field]),
  );

  console.log(
    JSON.stringify(
      {
        step: 'deal_summary',
        dealId,
        stageId: deal.STAGE_ID ?? null,
        title: deal.TITLE ?? null,
      },
      null,
      2,
    ),
  );

  const mappedInspection = trackedFields.map(({ dealContextKey, fieldName }) => {
    const definition = userFieldByName.get(fieldName);
    const rawValue = deal[fieldName];
    const userType = definition?.USER_TYPE_ID ?? 'unknown';
    const isEnum = userType === 'enumeration';
    const rawText =
      rawValue === null || rawValue === undefined ? null : String(rawValue).trim();
    const enumText = isEnum ? enumLabel(definition, rawText) : null;

    return {
      dealContextKey,
      fieldName,
      bitrixLabel: definition ? labelOf(definition) : null,
      userTypeId: userType,
      isEnum,
      rawValue: rawValue ?? null,
      resolvedText: enumText ?? (rawText === '' ? null : rawText),
      enumOptions: isEnum
        ? (definition?.LIST ?? []).map((item) => ({
            id: String(item.ID ?? ''),
            value: item.VALUE ?? '',
          }))
        : undefined,
    };
  });

  console.log(
    JSON.stringify(
      {
        step: 'mapped_fields_inspection',
        dealId,
        fields: mappedInspection,
      },
      null,
      2,
    ),
  );

  const productString = mappedInspection.find(
    (item) => item.dealContextKey === 'product',
  );
  const productEnum = mappedInspection.find(
    (item) => item.dealContextKey === 'product_enum',
  );

  console.log(
    JSON.stringify(
      {
        step: 'product_mapping_recommendation',
        dealId,
        current_parser_source: {
          field: DEFAULT_BITRIX_FIELD_MAPPING.product,
          rawValue: productString?.rawValue ?? null,
          resolvedText: productString?.resolvedText ?? null,
        },
        enum_fallback_source: {
          field: PRODUCT_ENUM_FIELD,
          rawValue: productEnum?.rawValue ?? null,
          resolvedText: productEnum?.resolvedText ?? null,
        },
        suggested_normalized_product:
          productString?.resolvedText ?? productEnum?.resolvedText ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
