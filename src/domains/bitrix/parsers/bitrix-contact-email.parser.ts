/** Extracts primary email from Bitrix crm.contact.get result.EMAIL shape. */
export function parseContactPrimaryEmail(
  contactFields: Record<string, unknown> | undefined,
): string | null {
  if (!contactFields) {
    return null;
  }

  const emailField = contactFields.EMAIL;
  if (!Array.isArray(emailField) || emailField.length === 0) {
    return null;
  }

  for (const entry of emailField) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const value = (entry as { VALUE?: unknown }).VALUE;
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}

export function readBitrixContactId(
  fields: Record<string, unknown> | undefined,
): string | null {
  if (!fields) {
    return null;
  }

  const value = fields.CONTACT_ID;
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}
