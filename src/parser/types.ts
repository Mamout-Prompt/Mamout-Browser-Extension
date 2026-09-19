/**
 * Represents the UI control types available for dynamic input fields.
 */
export enum InputType {
  /** Multiline text field for longer text entries. */
  TEXT = 'text',

  /** Single-line text field for short text entries. */
  SMALL_TEXT = 'smallText',

  /** Dropdown menu for selecting from a predefined list of options. */
  OPTIONS = 'options',
}

/**
 * Utility helper namespace providing static lookup operations for `InputType`.
 */
export namespace InputType {
  /**
   * All valid string keys for input types.
   */
  export const allKeys: readonly string[] = [
    InputType.TEXT,
    InputType.SMALL_TEXT,
    InputType.OPTIONS,
  ];

  /**
   * Finds an `InputType` by its string key, defaulting to `InputType.TEXT`.
   *
   * @param key - The string key to resolve.
   * @returns The matching `InputType` enum member, or `InputType.TEXT` if not found or nullish.
   */
  export function fromKey(key?: string | null): InputType {
    if (!key) return InputType.TEXT;

    const matched = allKeys.find((k) => k === key);
    return (matched as InputType) ?? InputType.TEXT;
  }
}

/**
 * Represents a segment of a parsed prompt template, which can be either static text or a dynamic input field.
 */
export type PromptSegment = StaticTextSegment | InputFieldSegment;

/**
 * Immutable text surrounding input fields.
 */
export interface StaticTextSegment {
  readonly kind: 'static_text';

  /** The raw static text content. */
  readonly text: string;
}

/**
 * Dynamic input field extracted from an `<INPUT>` tag.
 */
export interface InputFieldSegment {
  readonly kind: 'input_field';

  /**
   * Unique identifier for this input field, derived from its character
   * offset in the source template (e.g., "input_42" for a tag starting at index 42).
   */
  readonly id: string;

  /** The UI control type required to render this field. */
  readonly type: InputType;

  /** Default fallback value specified inside the `<INPUT>` tag. */
  readonly defaultValue: string;

  /** Predefined choices when `type` is `InputType.OPTIONS`. */
  readonly options: readonly string[];
}

/**
 * Container holding the original raw template string and its parsed ordered segments.
 */
export interface ParsedPromptTemplate {
  /** The original template string before parsing. */
  readonly rawTemplate: string;

  /** The ordered sequence of static text and input field segments. */
  readonly segments: readonly PromptSegment[];
}

/**
 * Helper factory to create a `StaticTextSegment`.
 *
 * @param text - The raw static text string.
 * @returns A frozen `StaticTextSegment` object.
 */
export function createStaticTextSegment(text: string): StaticTextSegment {
  return Object.freeze({
    kind: 'static_text',
    text,
  });
}

/**
 * Helper factory to create an `InputFieldSegment` with default parameters matching Kotlin data class defaults.
 *
 * @param id - Unique identifier for this input field.
 * @param type - The UI control type required to render this field.
 * @param defaultValue - Default fallback value specified inside the tag.
 * @param options - Predefined choices when type is `InputType.OPTIONS`. Defaults to an empty array.
 * @returns A frozen `InputFieldSegment` object.
 */
export function createInputFieldSegment(
  id: string,
  type: InputType,
  defaultValue: string,
  options: readonly string[] = []
): InputFieldSegment {
  return Object.freeze({
    kind: 'input_field',
    id,
    type,
    defaultValue,
    options,
  });
}

/**
 * Represents the type of tag match found during template parsing or text replacement operations.
 */
export enum MatchKind {
  INSERTION = 'insertion',
  EDIT = 'edit',
}

/**
 * Represents a match found within a prompt template.
 */
export interface PromptMatch {
  /** Starting index of the match within the template text. */
  startMarker: number;

  /** Ending index of the match within the template text. */
  endMarker: number;

  /** The type of match (insertion or edit). */
  matchKind: MatchKind;

  /** The original text if it was an edit match. */
  originalText?: string | null;

  /** The expected UI field type for this match. */
  fieldType: InputType;

  /** Optional list of values for selection fields. */
  values?: string[] | null;
}

/**
 * Wrapper for the metadata response containing all prompt matches.
 */
export interface MetaPromptResponse {
  /** List of parsed `PromptMatch` objects. */
  matches: PromptMatch[];
}

/**
 * Factory function to create a `PromptMatch` object with Kotlin-matching default values.
 *
 * @param params - Required and optional parameters for the match.
 * @returns A fully initialized `PromptMatch` object.
 */
export function createPromptMatch(
  params: Omit<PromptMatch, 'matchKind' | 'fieldType'> & {
    matchKind?: MatchKind;
    fieldType?: InputType;
  }
): PromptMatch {
  return {
    matchKind: MatchKind.EDIT,
    fieldType: InputType.SMALL_TEXT,
    originalText: null,
    values: null,
    ...params,
  };
}
