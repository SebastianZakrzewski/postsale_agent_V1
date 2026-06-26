import { SetPart } from '../types';

export const BITRIX_SET_VARIANT_ESCALATION_IDS = new Set(['1300', '1310']);

export const BITRIX_SET_VARIANT_PARTS: Readonly<
  Record<string, readonly SetPart[]>
> = {
  '270': ['front'],
  '272': ['rear'],
  '274': ['front', 'rear', 'general'],
  '276': ['front', 'rear', 'trunk', 'general'],
  '1332': ['front', 'trunk', 'general'],
  '1250': ['trunk'],
  '1260': ['third_row'],
  '1270': ['third_row'],
  '1280': ['third_row'],
  '1290': ['third_row'],
  '1072': ['third_row', 'trunk'],
  '1080': ['third_row', 'trunk'],
  '1088': ['third_row', 'trunk'],
};

export function resolveSetVariantParts(
  setVariantId: string | null | undefined,
): {
  parts: SetPart[];
  requiresSetVariantEscalation: boolean;
  escalateSingleMat: boolean;
} {
  if (!setVariantId) {
    return {
      parts: [],
      requiresSetVariantEscalation: true,
      escalateSingleMat: false,
    };
  }

  if (BITRIX_SET_VARIANT_ESCALATION_IDS.has(setVariantId)) {
    return {
      parts: [],
      requiresSetVariantEscalation: false,
      escalateSingleMat: true,
    };
  }

  const parts = BITRIX_SET_VARIANT_PARTS[setVariantId];
  if (!parts) {
    return {
      parts: [],
      requiresSetVariantEscalation: true,
      escalateSingleMat: false,
    };
  }

  return {
    parts: [...parts],
    requiresSetVariantEscalation: false,
    escalateSingleMat: false,
  };
}
