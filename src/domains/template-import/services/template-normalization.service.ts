import { Injectable } from '@nestjs/common';
import {
  EVAMATS_BODY_TYPE_SLUGS,
  EVAMATS_PRODUCT_SLUGS,
  POLISH_TO_ENGLISH_TOKENS,
} from '../config/evamats-slug-mappings';

const POLISH_DIACRITICS: Readonly<Record<string, string>> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

@Injectable()
export class TemplateNormalizationService {
  /**
   * @deprecated Use normalizeIdentifier / normalizeBodyType for persistence fields.
   * Kept for backward-compatible comparisons in tests that expect spaced lowercase.
   */
  normalizeField(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  normalizeIdentifier(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }

    const prepared = this.stripDiacritics(value.trim().toLowerCase());
    const translated = this.translatePolishTokens(prepared);
    return this.toSlug(translated, { allowHyphens: true });
  }

  normalizeBodyType(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }

    const spacedKey = this.normalizeField(value);
    const mapped = EVAMATS_BODY_TYPE_SLUGS[spacedKey];
    if (mapped) {
      return mapped;
    }

    const asciiKey = this.stripDiacritics(spacedKey);
    const mappedAscii = EVAMATS_BODY_TYPE_SLUGS[asciiKey];
    if (mappedAscii) {
      return mappedAscii;
    }

    return this.normalizeIdentifier(value);
  }

  normalizeProduct(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }

    const spacedKey = this.normalizeField(value);
    const mapped = EVAMATS_PRODUCT_SLUGS[spacedKey];
    if (mapped) {
      return mapped;
    }

    const asciiKey = this.stripDiacritics(spacedKey);
    const mappedAscii = EVAMATS_PRODUCT_SLUGS[asciiKey];
    if (mappedAscii) {
      return mappedAscii;
    }

    return this.normalizeIdentifier(value);
  }

  normalizeSourceField(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const slug = this.toSlug(this.stripDiacritics(value.trim().toLowerCase()), {
      allowHyphens: false,
    });
    return slug.length > 0 ? slug : null;
  }

  normalizeGeneration(value: string | null | undefined): string | null {
    const normalized = this.normalizeIdentifier(value);
    return normalized.length > 0 ? normalized : null;
  }

  normalizeAliases(raw: string | string[] | null | undefined): string[] {
    if (raw == null) {
      return [];
    }

    const parts = Array.isArray(raw)
      ? raw
      : raw.split(/[,;\n]/).map((part) => part.trim());

    const seen = new Set<string>();
    const result: string[] = [];

    for (const part of parts) {
      const normalized = part.includes('|')
        ? this.normalizeMatchKey(part)
        : this.normalizeIdentifier(part);
      if (normalized.length > 0 && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }

    return result;
  }

  buildMatchKey(
    brand: string,
    model: string,
    bodyType: string,
    generation: string | null,
  ): string {
    const parts = [
      this.normalizeIdentifier(brand),
      this.normalizeIdentifier(model),
      this.normalizeBodyType(bodyType),
    ];
    if (generation != null) {
      parts.push(this.normalizeGeneration(generation) ?? '');
    }
    return parts.filter((part) => part.length > 0).join('|');
  }

  normalizeMatchKey(value: string): string {
    return value
      .split('|')
      .map((part, index) => {
        const trimmed = part.trim();
        if (index === 2) {
          return this.normalizeBodyType(trimmed);
        }
        if (index === 3) {
          return this.normalizeGeneration(trimmed) ?? '';
        }
        return this.normalizeIdentifier(trimmed);
      })
      .filter((part) => part.length > 0)
      .join('|');
  }

  normalizeVehicleFields(input: {
    brand: string;
    model: string;
    bodyType: string;
    generation?: string | null;
  }): {
    brand: string;
    model: string;
    bodyType: string;
    generation: string | null;
  } {
    return {
      brand: this.normalizeIdentifier(input.brand),
      model: this.normalizeIdentifier(input.model),
      bodyType: this.normalizeBodyType(input.bodyType),
      generation: this.normalizeGeneration(input.generation),
    };
  }

  hasRequiredVehicleFields(input: {
    brand: string;
    model: string;
    bodyType: string;
  }): boolean {
    const normalized = this.normalizeVehicleFields(input);
    return (
      normalized.brand.length > 0 &&
      normalized.model.length > 0 &&
      normalized.bodyType.length > 0
    );
  }

  private stripDiacritics(value: string): string {
    return value.replace(
      /[ąćęłńóśźż]/g,
      (char) => POLISH_DIACRITICS[char] ?? char,
    );
  }

  private translatePolishTokens(value: string): string {
    let result = value;
    for (const [polish, english] of POLISH_TO_ENGLISH_TOKENS) {
      result = result.replace(new RegExp(polish, 'g'), english);
    }
    return result;
  }

  private toSlug(value: string, options: { allowHyphens: boolean }): string {
    const allowedPattern = options.allowHyphens
      ? /[^a-z0-9_-]+/g
      : /[^a-z0-9_]+/g;
    return value
      .replace(/[()]/g, '_')
      .replace(allowedPattern, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
