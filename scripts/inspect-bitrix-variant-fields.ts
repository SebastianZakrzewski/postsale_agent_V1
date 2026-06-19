/**
 * Inspect Bitrix userfield enum definitions for variant / product mapping.
 *
 * Usage:
 *   npm run inspect:bitrix-variant
 */
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';

interface UserFieldListItem {
  FIELD_NAME?: string;
  EDIT_FORM_LABEL?: Record<string, string> | string;
  LIST_COLUMN_LABEL?: Record<string, string> | string;
  USER_TYPE_ID?: string;
  LIST?: Array<{ ID?: string; VALUE?: string }>;
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

function enumLabel(field: UserFieldListItem, id: string | null): string | null {
  if (!field.LIST || !id) {
    return null;
  }
  const match = field.LIST.find((item) => String(item.ID) === String(id));
  return match?.VALUE?.trim() || null;
}

async function main(): Promise<void> {
  loadProjectDotEnv();
  const dealId = process.argv[2] ?? '34668';
  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error('Missing BITRIX_WEBHOOK_URL');
  }

  const base = webhookUrl.replace(/\/$/, '');
  const [dealRes, ufRes] = await Promise.all([
    fetch(`${base}/crm.deal.get?id=${dealId}`),
    fetch(`${base}/crm.deal.userfield.list`),
  ]);

  const deal = ((await dealRes.json()) as { result?: Record<string, unknown> })
    .result;
  const userFields =
    ((await ufRes.json()) as { result?: UserFieldListItem[] }).result ?? [];

  const keywords =
    /prz[oó]d|ty[lł]|komplet|wariant|front|rear|baga|mat|evapremium|rodzaj|zestaw|pakiet|rant/i;

  const variantFields = userFields
    .filter(
      (field) =>
        keywords.test(labelOf(field)) || keywords.test(field.FIELD_NAME ?? ''),
    )
    .map((field) => {
      const fieldName = field.FIELD_NAME ?? '';
      const raw = deal?.[fieldName];
      const rawText =
        raw === null || raw === undefined ? null : String(raw).trim();
      const resolved =
        field.USER_TYPE_ID === 'enumeration'
          ? enumLabel(field, rawText || null)
          : rawText || null;

      return {
        fieldName,
        label: labelOf(field),
        userTypeId: field.USER_TYPE_ID ?? 'unknown',
        rawValue: rawText || null,
        resolvedText: resolved,
        enumOptions:
          field.USER_TYPE_ID === 'enumeration'
            ? (field.LIST ?? []).map((item) => ({
                id: String(item.ID ?? ''),
                value: item.VALUE ?? '',
              }))
            : undefined,
      };
    });

  const populatedCustomFields = Object.entries(deal ?? {})
    .filter(([key]) => key.startsWith('UF_CRM'))
    .map(([key, value]) => {
      const definition = userFields.find((field) => field.FIELD_NAME === key);
      const rawText =
        value === null || value === undefined ? null : String(value).trim();
      if (!rawText) {
        return null;
      }
      const resolved =
        definition?.USER_TYPE_ID === 'enumeration'
          ? enumLabel(definition, rawText)
          : rawText;

      return {
        fieldName: key,
        label: definition ? labelOf(definition) : null,
        userTypeId: definition?.USER_TYPE_ID ?? 'unknown',
        rawValue: rawText,
        resolvedText: resolved,
      };
    })
    .filter((row) => row !== null);

  const variantFieldNames = [
    'UF_CRM_1757024931236',
    'UF_CRM_1757024835301',
    'UF_CRM_1781552572183',
  ];

  const variantFieldCatalog = variantFieldNames.map((fieldName) => {
    const definition = userFields.find(
      (field) => field.FIELD_NAME === fieldName,
    );
    if (!definition) {
      return { fieldName, found: false };
    }

    const raw = deal?.[fieldName];
    const rawText =
      raw === null || raw === undefined ? null : String(raw).trim();

    return {
      fieldName,
      found: true,
      label: labelOf(definition),
      listTitle: definition.LIST_COLUMN_LABEL ?? null,
      userTypeId: definition.USER_TYPE_ID ?? 'unknown',
      dealRawValue: rawText || null,
      dealResolvedText:
        definition.USER_TYPE_ID === 'enumeration'
          ? enumLabel(definition, rawText || null)
          : rawText || null,
      enumOptions: (definition.LIST ?? []).map((item) => ({
        id: String(item.ID ?? ''),
        value: item.VALUE ?? '',
      })),
    };
  });

  console.log(
    JSON.stringify(
      {
        dealId,
        variantFieldCatalog,
        variantRelatedFieldDefinitions: variantFields,
        allPopulatedUfCrmFields: populatedCustomFields,
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
