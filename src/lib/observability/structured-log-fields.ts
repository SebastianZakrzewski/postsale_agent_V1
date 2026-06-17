export function structuredLogFields(
  eventName: string,
  fields: Record<string, string | boolean | undefined>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { event_name: eventName };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
