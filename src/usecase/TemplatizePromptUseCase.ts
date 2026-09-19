import { MarkerTool } from '../parser/MarkerTool';
import { TagPromptParser } from '../parser/TagPromptParser';
import type { ParsedPromptTemplate, MetaPromptResponse, PromptMatch} from '../parser/types';

const META_PROMPT_TEMPLATE = `<CONTEXT>
You are an analysis module for a prompt management app. It lets users templatize prompts by isolating the parts that need subjective input. Instead of rewriting the whole prompt, return ONLY the coordinates of the points to change, in JSON, so the app — not you — applies the edits. This avoids truncation or unintended changes.
</CONTEXT>

<INPUT_FORMAT>
The prompt you receive is pre-processed: the app has inserted numeric markers in the form |N| at every possible boundary in the text (after spaces, and after structural punctuation like : , " ' [ ] { } and line breaks).

Each marker is a precise, unique position in the original text. The text between two consecutive markers (e.g. between |12| and |13|) is a token/fragment of the original text.

- Markers are NOT part of the original text — they are position references added by the app.
- Never invent, alter, or "correct" a marker; use only marker numbers you actually see in the input.
- If a value to replace spans multiple tokens, use the marker right before the first token as start_marker and the marker right after the last token as end_marker.
</INPUT_FORMAT>

<OBJECTIVE>
Identify every point that is a dynamic value or a field to fill in. For each, return: its position (start_marker, end_marker), the intervention type (insertion or edit), and the expected data type.
</OBJECTIVE>

<MATCH_KIND>
- "insertion" → an actual empty spot in the text (placeholder char like \\0, double space, missing word/preposition). No existing text to replace. start_marker and end_marker are the same number.
- "edit" → text already present that must be fully replaced (e.g. "...", "___", "[insert here]", a literal like true, a number, a placeholder string). Put the existing text in original_text. start_marker = marker right before it, end_marker = marker right after it.
</MATCH_KIND>

<FIELD_TYPE>
- "text" → expected value of 10+ words.
- "smallText" → expected value under 10 words.
- "options" → value from a finite set. If not explicit, infer plausible values and list them in "values".

CRITICAL: placeholder length does NOT indicate expected content length. A short "..." may need a long answer if the prompt states so elsewhere (e.g. "write at least 5 sentences", "explain in detail", "a short title"). Always search the WHOLE prompt for such length cues first; they override the placeholder's own length. With no length cue, judge by semantics: names, dates, numbers, titles, single words → smallText; descriptions, explanations, narrative/argumentative content → text.

Special case: a boolean literal (true/false) tied to a key name that reads as a configurable binary preference (e.g. "enabled", "active", "paid_books") → classify as "options", values ["true","false"], match_kind "edit", original_text = the literal shown (e.g. "true").
</FIELD_TYPE>

<OPTIONS_INFERENCE priority="HIGH">
Be PROACTIVE about "options" even when alternatives aren't spelled out. Nouns that commonly imply a closed set (a tone/register, a language, an output format, an intensity/size level, a binary state, a priority tier, a day of week, and similar) are strong signals. When you spot one, classify as "options" and generate 3–6 plausible, mutually exclusive values yourself from context. Don't reserve "options" only for 100%-obvious cases — but don't force it onto clearly open-ended fields either (a proper name, a free description, an open topic).
</OPTIONS_INFERENCE>

<DETECTION_CRITERION priority="HIGH">
Be parsimonious about WHETHER to include a point at all: when in doubt, exclude it — a false negative is better than a false positive, since the user can still edit the prompt manually.

Include a point ONLY when it's clearly true that:
- without that value the prompt is nonsensical, syntactically incomplete, or produces a generic/wrong output;
- the segment is visibly a placeholder, empty field, or interrupted portion;
- that data changes every time the prompt is reused.

Do NOT include ambiguous segments, technical terminology, role/persona names, or wording that could be intentionally fixed.

This parsimony applies ONLY to the inclusion decision. Once a point is included, be accurate and proactive (not minimalist) about field_type and options — defaulting everything to "smallText" out of laziness is as wrong as over-including points.
</DETECTION_CRITERION>

<MARKER_SELECTION_RULES>
- start_marker/end_marker must be integers that actually appear in the input; never invent one.
- Keep the marker span as tight as possible around the target — exclude surrounding spaces/quotes/punctuation unless they too must be replaced.
- Adjacent distinct points must have non-overlapping marker spans.
</MARKER_SELECTION_RULES>

<OUTPUT_SCHEMA>
Respond ONLY with this JSON, no text before or after:

{
  "matches": [
    {
      "start_marker": 12,
      "end_marker": 13,
      "match_kind": "insertion" | "edit",
      "original_text": "exact text being replaced — include ONLY if match_kind is 'edit'",
      "field_type": "text" | "smallText" | "options",
      "values": ["v1", "v2", "v3"]
    }
  ]
}

Include "values" only when field_type is "options". Include "original_text" only when match_kind is "edit".
</OUTPUT_SCHEMA>

<EXAMPLES>
1) Length inferred from context, not placeholder:
Input: "Write a description of at least 5 sentences for the product: |40|...|41|, that is engaging."
→ {"start_marker": 40, "end_marker": 41, "match_kind": "edit", "original_text": "...", "field_type": "text"}

2) Proactive "options" on a boolean:
Input: "\\"notifications_enabled\\": |8|true|9|,"
→ {"start_marker": 8, "end_marker": 9, "match_kind": "edit", "original_text": "true", "field_type": "options", "values": ["true", "false"]}

3) Insertion vs edit, same content type:
Input: "The recipient is |15||15| and the document is about |22|...|23|"
→ point 1 (empty gap): {"start_marker": 15, "end_marker": 15, "match_kind": "insertion", "field_type": "smallText"}
→ point 2 (existing placeholder): {"start_marker": 22, "end_marker": 23, "match_kind": "edit", "original_text": "...", "field_type": ...}
</EXAMPLES>

########

{{marked_text}}

########`;

/**
 * Use case responsible for preparing prompts for LLM analysis and parsing
 * LLM responses into structured prompt templates.
 */
export const TemplatizePromptUseCase = {
  /**
   * Prepares the raw prompt by adding boundary markers and injecting it into the meta-prompt template.
   *
   * @param originalPrompt - The un-marked prompt template text.
   * @returns Full meta-prompt ready to be sent to an LLM.
   */
  preparePromptForLlm(originalPrompt: string): string {
    const { markedText } = MarkerTool.markText(originalPrompt);
    return META_PROMPT_TEMPLATE.replace('{{marked_text}}', markedText);
  },

  /**
   * Parses the LLM's JSON response and applies the detected matches to `originalPrompt`.
   *
   * Handles cases where the LLM wraps JSON inside Markdown code fences or extra text.
   *
   * @param originalPrompt - The original raw prompt text.
   * @param llmJsonResponse - The raw text response returned by the LLM.
   * @returns Parsed prompt template containing static and input field segments.
   * @throws Error if no valid JSON object structure can be extracted or parsed.
   */
  templatize(originalPrompt: string, llmJsonResponse: string): ParsedPromptTemplate {
    const jsonString = this.extractJsonObject(llmJsonResponse);
    const response = JSON.parse(jsonString) as MetaPromptResponse;

    if (!response || !Array.isArray(response.matches)) {
      throw new Error('Invalid LLM response format: missing "matches" array.');
    }

    return this.processLlmResponse(originalPrompt, response.matches);
  },

  /**
   * Applies structured matches to `originalPrompt` and parses the generated `<INPUT>` tags.
   *
   * @param originalPrompt - The original raw prompt text.
   * @param matches - List of matches extracted from LLM response.
   * @returns Parsed prompt template with ordered segments.
   */
  processLlmResponse(
    originalPrompt: string,
    matches: readonly PromptMatch[]
  ): ParsedPromptTemplate {
    const promptWithInputTags = MarkerTool.applyMatches(originalPrompt, matches);
    return TagPromptParser.parse(promptWithInputTags);
  },

  /**
   * Extracts the outermost `{...}` JSON object from raw response string,
   * skipping string literals and handling nested brackets.
   *
   * @param rawResponse - Unfiltered string returned by LLM.
   * @returns Extracted JSON string.
   */
  extractJsonObject(rawResponse: string): string {
    const start = rawResponse.indexOf('{');
    if (start === -1) return rawResponse;

    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = start; i < rawResponse.length; i++) {
      const c = rawResponse[i];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (c === '\\' && inString) {
        isEscaped = true;
        continue;
      }

      if (c === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) {
          return rawResponse.substring(start, i + 1);
        }
      }
    }

    return rawResponse;
  },
};
