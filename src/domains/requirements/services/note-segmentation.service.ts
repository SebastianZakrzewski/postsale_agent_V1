import { Injectable } from '@nestjs/common';
import { SelectedTemplateNote } from '../../template-matching/types';

const NUMBERED_MARKER = /\d+[.)]\s*/g;
const PROSZE_AFTER_PERIOD = /(?<=\.)\s+(?=Proszę\s)/i;

@Injectable()
export class NoteSegmentationService {
  segmentNotes(notes: SelectedTemplateNote[]): SelectedTemplateNote[] {
    return notes.flatMap((note) => this.segmentNote(note));
  }

  segmentNote(note: SelectedTemplateNote): SelectedTemplateNote[] {
    const trimmed = note.text.trim();
    if (!trimmed) {
      return [];
    }

    const segments = splitByNumberedMarkers(trimmed) ??
      splitByConjunctiveCzy(trimmed) ??
      splitByProszeSentences(trimmed) ?? [trimmed];

    if (segments.length <= 1) {
      return [{ ...note, text: trimmed }];
    }

    return segments.map((text) => ({
      part: note.part,
      column: note.column,
      text,
    }));
  }
}

function splitByNumberedMarkers(text: string): string[] | null {
  const markers = [...text.matchAll(NUMBERED_MARKER)];
  if (markers.length < 2) {
    return null;
  }

  const segments: string[] = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const markerIndex = marker.index;
    if (markerIndex === undefined) {
      continue;
    }

    const start = markerIndex + marker[0].length;
    const end =
      index + 1 < markers.length
        ? (markers[index + 1].index ?? text.length)
        : text.length;
    const segment = text.slice(start, end).trim();
    if (segment.length > 0) {
      segments.push(segment);
    }
  }

  return segments.length >= 2 ? segments : null;
}

function splitByConjunctiveCzy(text: string): string[] | null {
  const conjunctiveCzy = /\s+(?:i|oraz)\s+czy\s+/i;
  if (!conjunctiveCzy.test(text)) {
    return null;
  }

  const parts = text.split(conjunctiveCzy);
  if (parts.length < 2) {
    return null;
  }

  const segments = parts
    .map((part, index) => {
      const trimmed = part.trim();
      if (index === 0) {
        return trimmed;
      }
      if (/^(czy|prosz|prosimy|sprawdz)/i.test(trimmed)) {
        return trimmed;
      }
      return `czy ${trimmed}`;
    })
    .filter((segment) => segment.length > 0);

  return segments.length >= 2 ? segments : null;
}

function splitByProszeSentences(text: string): string[] | null {
  if (!PROSZE_AFTER_PERIOD.test(text)) {
    return null;
  }

  const segments = text
    .split(PROSZE_AFTER_PERIOD)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  return segments.length >= 2 ? segments : null;
}
