import { NoteSegmentationService } from '../../domains/requirements/services/note-segmentation.service';
import { SelectedTemplateNote } from '../../domains/template-matching/types';

describe('NoteSegmentationService', () => {
  const service = new NoteSegmentationService();

  function note(text: string): SelectedTemplateNote {
    return {
      part: 'trunk',
      column: 'notes_trunk_general',
      text,
    };
  }

  it('splits BMW X5 compound numbered note into two segments', () => {
    const source =
      '1) Proszę sprawdzić czy ma Pan haczyki w bagażniku i czy chciałby Pan mieć wycięcia pod haczyki? (zalecamy nie robić wycięć). 2) Proszę o informację czy przykrywamy wnękę w bagażniku?';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe(
      'Proszę sprawdzić czy ma Pan haczyki w bagażniku i czy chciałby Pan mieć wycięcia pod haczyki? (zalecamy nie robić wycięć).',
    );
    expect(segments[1].text).toBe(
      'Proszę o informację czy przykrywamy wnękę w bagażniku?',
    );
  });

  it('keeps single-question notes unchanged', () => {
    const source = 'Proszę o informację czy przykrywamy wnękę w bagażniku?';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe(source);
  });

  it('keeps option-selection notes unchanged', () => {
    const source =
      'Proszę o sprawdzenie jaki poziom bagażnika robimy: górny czy dolny? (zalecamy górny)';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe(source);
  });

  it('splits notes with numbered dot markers', () => {
    const source =
      '1. Proszę o zaznaczenie który poziom bagażnika robimy, górny czy dolny? 2. Proszę sprawdzić czy ma Pan haczyki w bagażniku?';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toContain('poziom bagażnika');
    expect(segments[1].text).toContain('haczyki');
  });

  it('splits multiple Proszę sentences separated by periods', () => {
    const source =
      'Proszę o informację czy przykrywamy wnękę w bagażniku. Proszę sprawdzić czy są haczyki w bagażniku.';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe(
      'Proszę o informację czy przykrywamy wnękę w bagażniku.',
    );
    expect(segments[1].text).toBe(
      'Proszę sprawdzić czy są haczyki w bagażniku.',
    );
  });

  it('splits single-sentence notes with conjunctive czy clauses', () => {
    const source =
      'Prosimy o informację, czy mamy zakryć wnęki (ucha) w bagażniku i czy też są haczyki w bagażniku i czy zakrywamy je?';

    const segments = service.segmentNote(note(source));

    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe(
      'Prosimy o informację, czy mamy zakryć wnęki (ucha) w bagażniku',
    );
    expect(segments[1].text).toBe('czy też są haczyki w bagażniku');
    expect(segments[2].text).toBe('czy zakrywamy je?');
  });

  it('segments each input note independently', () => {
    const segments = service.segmentNotes([
      note('Proszę o informację czy przykrywamy wnękę w bagażniku?'),
      note(
        '1) Proszę sprawdzić czy ma Pan haczyki w bagażniku? 2) Proszę o informację czy przykrywamy wnękę w bagażniku?',
      ),
    ]);

    expect(segments).toHaveLength(3);
  });
});
