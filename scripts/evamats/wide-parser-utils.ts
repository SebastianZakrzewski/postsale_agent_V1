export function buildMatchKey(input: {
  brand: string;
  model: string;
  generation: string | null;
  body_type_1: string;
}): string {
  const parts = [
    input.brand,
    input.model,
    input.generation ?? '',
    input.body_type_1,
  ];
  return parts.join('|');
}
