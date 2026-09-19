import {
  type ParsedPromptTemplate,
  type PromptSegment,
  createInputFieldSegment,
  createStaticTextSegment,
} from './types';
import { InputType } from './types';

/**
 * Utility responsible for parsing `<INPUT>` tags from prompt templates
 * and constructing final prompt strings with user-supplied values.
 */
export const TagPromptParser = {
  /** The name of the tag used for dynamic input fields. */
  INPUT_TAG: 'INPUT',

  /**
   * Checks if a given tag name corresponds to an input field tag (case-insensitive).
   *
   * @param tagName - The tag name to evaluate.
   * @returns `true` if the tag name matches "INPUT", `false` otherwise.
   */
  isInputTag(tagName: string): boolean {
    return tagName.toUpperCase() === this.INPUT_TAG;
  },

  /**
   * Parses a raw prompt template containing `<INPUT>` tags into structured segments.
   *
   * Each input field ID is derived from its character offset in `templateText`
   * (e.g. `"input_42"` for a tag starting at index 42).
   *
   * @param templateText - The raw prompt template string to parse.
   * @returns A `ParsedPromptTemplate` containing ordered static and input segments.
   */
  parse(templateText: string): ParsedPromptTemplate {
    const segments: PromptSegment[] = [];
    let lastIndex = 0;

    // Matches <INPUT ...>default_value</INPUT> across multiple lines ('s' flag)
    const inputTagRegex = /<INPUT\b(?<attributes>[^>]*)>(?<defaultValue>.*?)<\/INPUT>/gis;
    const typeAttrRegex = /type="([^"]+)"/i;
    const valuesAttrRegex = /values="([^"]+)"/i;

    let match: RegExpExecArray | null;

    while ((match = inputTagRegex.exec(templateText)) !== null) {
      const matchIndex = match.index;

      // 1. Extract and append static text preceding the current <INPUT> tag
      if (matchIndex > lastIndex) {
        const staticChunk = templateText.slice(lastIndex, matchIndex);
        segments.push(createStaticTextSegment(staticChunk));
      }

      // 2. Extract attributes string and inner default content
      const groups = match.groups ?? {};
      const attributesString = groups.attributes ?? '';
      const defaultValue = groups.defaultValue ?? '';

      // 3. Parse optional 'type' and 'values' attributes
      const typeMatch = typeAttrRegex.exec(attributesString);
      const valuesMatch = valuesAttrRegex.exec(attributesString);

      const typeStr = typeMatch?.[1] ?? null;
      const valuesStr = valuesMatch?.[1] ?? null;

      const inputType = InputType.fromKey(typeStr);

      let optionsList: string[] = [];
      if (inputType === InputType.OPTIONS && valuesStr) {
        optionsList = valuesStr.split(',').map((val) => val.trim());
      }

      // 4. Create and append the InputField segment, ID keyed by character offset
      segments.push(
        createInputFieldSegment(
          `input_${matchIndex}`,
          inputType,
          defaultValue,
          optionsList
        )
      );

      lastIndex = inputTagRegex.lastIndex;
    }

    // 5. Append trailing static text after the final <INPUT> tag if present
    if (lastIndex < templateText.length) {
      segments.push(createStaticTextSegment(templateText.slice(lastIndex)));
    }

    return {
      rawTemplate: templateText,
      segments,
    };
  },

  /**
   * Reconstructs the final prompt string by replacing input field placeholders
   * with user-provided inputs, falling back to default values when missing.
   *
   * @param parsed - The parsed template containing ordered segments.
   * @param userInputs - Map or record of input field IDs to user-supplied string values.
   * @returns The compiled final prompt string.
   */
  buildFinalPrompt(
    parsed: ParsedPromptTemplate,
    userInputs: Record<string, string> | Map<string, string>
  ): string {
    return parsed.segments
      .map((segment) => {
        if (segment.kind === 'static_text') {
          return segment.text;
        }

        const value =
          userInputs instanceof Map
            ? userInputs.get(segment.id)
            : userInputs[segment.id];

        return value ?? segment.defaultValue;
      })
      .join('');
  },
};
