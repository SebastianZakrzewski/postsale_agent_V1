export interface BitrixDealFileUpload {
  filename: string;
  contentBase64: string;
}

/** CRM item API uses camelCase user field names (e.g. UF_CRM_123 → ufCrm_123). */
export function toCrmItemUserFieldName(fieldName: string): string {
  if (fieldName.startsWith('UF_CRM_')) {
    return `ufCrm_${fieldName.slice('UF_CRM_'.length)}`;
  }
  return fieldName;
}

export function parseExistingBitrixFileIds(raw: unknown): number[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => extractBitrixFileId(item));
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).flatMap(
      ([key, value]) => {
        if (/^\d+$/.test(key)) {
          const id = Number(key);
          if (
            value === key ||
            value === id ||
            (typeof value === 'object' &&
              value !== null &&
              'id' in value &&
              Number((value as { id: unknown }).id) === id)
          ) {
            return [id];
          }
        }
        return extractBitrixFileId(value);
      },
    );
  }

  return extractBitrixFileId(raw);
}

function extractBitrixFileId(value: unknown): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value];
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return [Number(value)];
  }
  if (value && typeof value === 'object' && 'id' in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? [id] : [];
  }
  return [];
}

export function buildBitrixMultipleFileFieldUpdate(
  existingRaw: unknown,
  uploads: BitrixDealFileUpload[],
): Record<string, unknown> {
  const field: Record<string, unknown> = {};

  for (const existingId of parseExistingBitrixFileIds(existingRaw)) {
    field[String(existingId)] = existingId;
  }

  uploads.forEach((upload, index) => {
    field[`n${index}`] = [upload.filename, upload.contentBase64];
  });

  return field;
}
