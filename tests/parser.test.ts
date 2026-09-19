import { describe, it, expect } from 'vitest';
import { TagPromptParser } from '../src/parser/TagPromptParser';
import { MarkerTool } from '../src/parser/MarkerTool';
import { InputType } from '../src/parser/types';
import { MatchKind } from '../src/parser/types';
import type { PromptMatch } from '../src/parser/types';

describe('TagPromptParser Suite', () => {
  it('should parse <INPUT> tags and assign offset-based IDs', () => {
    const rawTemplate = 'Hello <INPUT type="text">World</INPUT>, how are you?';
    const parsed = TagPromptParser.parse(rawTemplate);

    expect(parsed.segments).toHaveLength(3);
    expect(parsed.segments[0]).toEqual({
      kind: 'static_text',
      text: 'Hello ',
    });
    expect(parsed.segments[1]).toEqual({
      kind: 'input_field',
      id: 'input_6',
      type: InputType.TEXT,
      defaultValue: 'World',
      options: [],
    });
    expect(parsed.segments[2]).toEqual({
      kind: 'static_text',
      text: ', how are you?',
    });
  });

  it('should parse dropdown option attributes correctly', () => {
    const rawTemplate = 'Choose: <INPUT type="options" values="A, B, C">A</INPUT>';
    const parsed = TagPromptParser.parse(rawTemplate);

    expect(parsed.segments[1]).toMatchObject({
      kind: 'input_field',
      type: InputType.OPTIONS,
      options: ['A', 'B', 'C'],
    });
  });

  it('should construct the final prompt with user provided inputs', () => {
    const rawTemplate = 'Target destination: <INPUT type="text">Paris</INPUT>';
    const parsed = TagPromptParser.parse(rawTemplate);

    const compiled = TagPromptParser.buildFinalPrompt(parsed, {
      input_20: 'Rome',
    });

    expect(compiled).toBe('Target destination: Rome');
  });
});

describe('MarkerTool Suite', () => {
  it('should render indexed markers correctly across text boundaries', () => {
    const text = 'Write an email to: John.';
    const { markedText, markerOffsets } = MarkerTool.markText(text);

    expect(markedText).toContain('|0|');
    expect(markerOffsets.length).toBeGreaterThan(0);
  });

  it('should apply LLM match replacements into <INPUT> tag placeholders', () => {
    const originalText = 'Send a message to: Alex.';

    // Boundary 2 is after ':' (offset 18) and Boundary 3 is before '.' (offset 23)
    const matches: PromptMatch[] = [
      {
        startMarker: 2,
        endMarker: 3,
        fieldType: InputType.SMALL_TEXT,
        matchKind: MatchKind.EDIT,
      },
    ];

    const result = MarkerTool.applyMatches(originalText, matches);
    expect(result).toContain('<INPUT type="smallText">Alex</INPUT>');
  });
});
