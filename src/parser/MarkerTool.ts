import { MatchKind } from './types';
import type { PromptMatch } from './types';
import { InputType } from './types';

/**
 * Result of marking a text with numbered position markers.
 */
export interface MarkResult {
  /** The rendered string containing `|0|`, `|1|`, ... markers interspersed in text. */
  readonly markedText: string;

  /** Array of character index offsets corresponding to each marker index. */
  readonly markerOffsets: readonly number[];
}

interface ResolvedMatch {
  readonly contentStart: number;
  readonly contentEnd: number;
  readonly placeholder: string;
}

const TAG = '[MarkerTool]';

const PUNCT_CHARS = new Set([
  ':',
  '"',
  "'",
  '[',
  ']',
  '{',
  '}',
  '(',
  ')',
  ',',
  ';',
]);

const RUNNABLE_PUNCT = /\.{2,}|_{2,}|-{2,}|\./g;
const ANOMALOUS_GAP = /[ \t]{2,}/g;
const WHITESPACE_RUN = /\s+/g;

/**
 * Utility responsible for analyzing text boundary markers and converting
 * match spans (`PromptMatch`) into dynamic `<INPUT>` tag placeholders.
 */
export const MarkerTool = {
  /**
   * Generates a marked string with numbered delimiters (e.g., `|0|Word|1|`)
   * and computes character offsets for marker positions.
   *
   * @param text - The raw source text.
   * @returns A `MarkResult` containing the marked string and offset index map.
   */
  markText(text: string): MarkResult {
    const offsets = this.buildMarkerMap(text);
    const markedText = this.renderMarkedText(text, offsets);
    return { markedText, markerOffsets: offsets };
  },

  /**
   * Computes sorted, de-duplicated boundary offset positions in the text based on
   * punctuation characters, runs of punctuation, and anomalous white-space gaps.
   *
   * @param text - The input text string.
   * @returns Array of character offset indices.
   */
  buildMarkerMap(text: string): number[] {
    const boundaries = new Set<number>([0, text.length]);

    // 1. Punctuation character boundaries
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== undefined && PUNCT_CHARS.has(ch)) {
        boundaries.add(i);
        boundaries.add(i + 1);
      }
    }

    // 2. Runnable punctuation boundaries
    RUNNABLE_PUNCT.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = RUNNABLE_PUNCT.exec(text)) !== null) {
      boundaries.add(match.index);
      boundaries.add(match.index + match[0].length);
    }

    // 3. Anomalous white-space gap boundaries
    ANOMALOUS_GAP.lastIndex = 0;
    while ((match = ANOMALOUS_GAP.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      if (matchStart > 0 && matchEnd < text.length) {
        boundaries.add(matchStart);
        boundaries.add(matchEnd);
      }
    }

    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    if (sorted.length === 0) return [];

    const first = sorted[0];
    if (first === undefined) return [];

    const merged: number[] = [first];

    for (let i = 1; i < sorted.length; i++) {
      const pos = sorted[i];
      const prev = merged[merged.length - 1];

      if (pos !== undefined && prev !== undefined) {
        const segment = text.substring(prev, pos);

        // Skip consecutive markers separating empty white space
        if (pos !== prev && segment.trim() === '') {
          continue;
        }
        merged.push(pos);
      }
    }

    return merged;
  },

  /**
   * Renders a text string with interspersed marker labels `|0|`, `|1|`, etc.
   *
   * @param text - Source text.
   * @param markerOffsets - Computed boundary offsets.
   * @returns Formatted marked text string.
   */
  renderMarkedText(text: string, markerOffsets: readonly number[]): string {
    let result = '';
    const n = markerOffsets.length;

    for (let i = 0; i < n; i++) {
      result += `|${i}|`;
      if (i + 1 < n) {
        const start = markerOffsets[i];
        const end = markerOffsets[i + 1];

        if (start !== undefined && end !== undefined) {
          const segment = text.substring(start, end);
          const stripped = segment.trim();

          if (stripped === '') {
            if (/^[ \t]{2,}$/.test(segment)) {
              result += ' ';
            }
          } else {
            result += stripped.replace(WHITESPACE_RUN, ' ');
          }
        }
      }
    }

    return result;
  },

  /**
   * Applies prompt matches by replacing target marker spans with `<INPUT>` tags.
   *
   * @param text - The raw prompt text.
   * @param matches - List of matches specifying marker indices and field metadata.
   * @returns The updated text with `<INPUT>` tags injected.
   */
  applyMatches(text: string, matches: readonly PromptMatch[]): string {
    const markerOffsets = this.buildMarkerMap(text);
    const nMarkers = markerOffsets.length;

    const offsetOf = (idx: number): number | null => {
      if (idx >= 0 && idx < nMarkers) {
        return markerOffsets[idx] ?? null;
      }
      return null;
    };

    const resolved: ResolvedMatch[] = [];

    for (const m of matches) {
      const startOff = offsetOf(m.startMarker);
      const endOff = offsetOf(m.endMarker);

      if (startOff === null || endOff === null) {
        console.warn(`${TAG} Marker out of range, skipping match:`, m);
        continue;
      }

      if (startOff > endOff) {
        console.warn(`${TAG} start_marker after end_marker, skipping match:`, m);
        continue;
      }

      const rawSpan = text.substring(startOff, endOff);
      const leftTrim = rawSpan.length - rawSpan.trimStart().length;
      const rightTrim = rawSpan.length - rawSpan.trimEnd().length;

      let contentStart = startOff + leftTrim;
      let contentEnd = endOff - rightTrim;

      if (contentStart > contentEnd) {
        contentStart = startOff;
        contentEnd = startOff;
      }

      const originalContent = text.substring(contentStart, contentEnd);

      if (m.matchKind === MatchKind.EDIT && originalContent.length === 0) {
        console.warn(
          `${TAG} Match 'edit' between ${m.startMarker}-${m.endMarker} resolves to an empty span.`
        );
      }

      const placeholder = this.buildInputTagPlaceholder(m, originalContent);
      resolved.push({ contentStart, contentEnd, placeholder });
    }

    // Sort ascending by start offset to detect overlap
    resolved.sort((a, b) => a.contentStart - b.contentStart);

    const safeResolved: ResolvedMatch[] = [];
    for (let i = 0; i < resolved.length; i++) {
      const current = resolved[i];
      const lastSafe = safeResolved[safeResolved.length - 1];

      if (current) {
        if (i > 0 && lastSafe && current.contentStart < lastSafe.contentEnd) {
          console.warn(
            `${TAG} Overlapping match ignored (offset ${current.contentStart})`
          );
          continue;
        }
        safeResolved.push(current);
      }
    }

    // Process replacements right-to-left (descending) to preserve character indices
    safeResolved.sort((a, b) => b.contentStart - a.contentStart);

    let result = text;
    for (const r of safeResolved) {
      const safeStart = Math.min(r.contentStart, result.length);
      const safeEnd = Math.min(r.contentEnd, result.length);

      result =
        result.substring(0, safeStart) +
        r.placeholder +
        result.substring(safeEnd);
    }

    return result;
  },

  /**
   * Formats a `<INPUT>` tag placeholder string from match specifications.
   *
   * @param match - Match details.
   * @param originalContent - The original snippet text captured between markers.
   * @returns Constructed `<INPUT ...>default</INPUT>` string.
   */
  buildInputTagPlaceholder(match: PromptMatch, originalContent: string): string {
    let typeAttr: string;

    switch (match.fieldType) {
      case InputType.TEXT:
        typeAttr = 'text';
        break;
      case InputType.SMALL_TEXT:
        typeAttr = 'smallText';
        break;
      case InputType.OPTIONS:
        typeAttr = 'options';
        break;
      default:
        typeAttr = 'smallText';
        break;
    }

    let attributes = `type="${typeAttr}"`;

    if (
      match.fieldType === InputType.OPTIONS &&
      match.values &&
      match.values.length > 0
    ) {
      const valuesStr = match.values.join(',');
      attributes += ` values="${valuesStr}"`;
    }

    const defaultValue =
      match.matchKind === MatchKind.EDIT ? originalContent : '';

    return `<INPUT ${attributes}>${defaultValue}</INPUT>`;
  },
};
