import { BodyTypeFamily, BodyTypeProfile } from '../types';

const GENERIC_SUV_SLUGS = new Set(['suv', 'suv_5_door', 'suv_5_seater']);
const GENERIC_MINIVAN_SLUGS = new Set(['minivan', 'minivan_5_seater']);
/** EVAMATS import corruption of "van dostawczak" — treat as van. */
const VAN_SLUGS = new Set(['van', 'van_dseaterawczak']);

function isGenericSuvFiveSeater(profile: BodyTypeProfile): boolean {
  return profile.family === 'suv' && profile.seatCount === 5;
}

function isGenericMinivanFiveSeater(profile: BodyTypeProfile): boolean {
  return profile.family === 'minivan' && profile.seatCount === 5;
}

export function resolveBodyTypeProfile(bodyTypeSlug: string): BodyTypeProfile {
  const canonical = bodyTypeSlug;

  if (GENERIC_SUV_SLUGS.has(canonical)) {
    return { canonical, seatCount: 5, family: 'suv' };
  }
  if (canonical === 'suv_6_seater') {
    return { canonical, seatCount: 6, family: 'suv' };
  }
  if (canonical === 'suv_7_seater') {
    return { canonical, seatCount: 7, family: 'suv' };
  }
  if (GENERIC_MINIVAN_SLUGS.has(canonical)) {
    return { canonical, seatCount: 5, family: 'minivan' };
  }
  if (canonical === 'minivan_7_seater' || canonical === 'minivan_8seater') {
    return { canonical, seatCount: 7, family: 'minivan' };
  }
  if (canonical === 'estate' || canonical === 'wagon') {
    return { canonical: 'estate', seatCount: null, family: 'estate' };
  }
  if (canonical === 'hatchback' || canonical.startsWith('hatchback_')) {
    return { canonical, seatCount: null, family: 'hatchback' };
  }
  if (canonical === 'sedan') {
    return { canonical, seatCount: null, family: 'sedan' };
  }
  if (canonical === 'liftback') {
    return { canonical, seatCount: null, family: 'liftback' };
  }
  if (VAN_SLUGS.has(canonical)) {
    return { canonical: 'van', seatCount: null, family: 'van' };
  }

  return { canonical, seatCount: null, family: 'other' };
}

export function areBodyTypesCompatible(
  dealProfile: BodyTypeProfile,
  templateSlug: string,
): boolean {
  const templateProfile = resolveBodyTypeProfile(templateSlug);

  if (dealProfile.canonical === templateProfile.canonical) {
    return true;
  }

  if (
    isGenericSuvFiveSeater(templateProfile) &&
    isGenericSuvFiveSeater(dealProfile)
  ) {
    return true;
  }

  if (
    isGenericMinivanFiveSeater(templateProfile) &&
    isGenericMinivanFiveSeater(dealProfile)
  ) {
    return true;
  }

  if (
    dealProfile.family === 'suv' &&
    dealProfile.seatCount === 7 &&
    templateProfile.family === 'suv' &&
    templateProfile.seatCount === 7
  ) {
    return true;
  }

  if (
    dealProfile.family === 'suv' &&
    dealProfile.seatCount === 6 &&
    templateProfile.family === 'suv' &&
    templateProfile.seatCount === 6
  ) {
    return true;
  }

  if (
    dealProfile.family === 'minivan' &&
    dealProfile.seatCount === 7 &&
    templateProfile.family === 'minivan' &&
    templateProfile.seatCount === 7
  ) {
    return true;
  }

  if (dealProfile.family === 'van' && templateProfile.family === 'van') {
    return true;
  }

  return false;
}

export function templateRowMatchesBodyType(
  dealProfile: BodyTypeProfile,
  template: {
    body_type_1: string;
    body_type_2: string | null;
    body_type_3: string | null;
  },
): boolean {
  const slugs = [
    template.body_type_1,
    template.body_type_2,
    template.body_type_3,
  ].filter((value): value is string => value != null && value.length > 0);

  return slugs.some((slug) => areBodyTypesCompatible(dealProfile, slug));
}

export function familyLabel(family: BodyTypeFamily): string {
  return family;
}
