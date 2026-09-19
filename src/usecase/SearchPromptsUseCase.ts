import { liveQuery, type Observable } from 'dexie';
import { db } from '../db/database';
import { getSearchablePrompts } from '../db/repository';
import type { PromptEntity, PromptSearchableDb } from '../types/prompt';

/**
 * Use case responsible for filtering prompts based on a search query.
 */
export const SearchPromptsUseCase = {
  /** Minimum query length required to trigger text filtering. */
  MIN_QUERY_LENGTH: 2,

  /**
   * Filters an array of searchable prompt projections in memory.
   *
   * @param items - List of searchable prompt database projections.
   * @param query - The search query string.
   * @returns Filtered array of lightweight PromptEntity objects.
   */
  filterInMemory(items: readonly PromptSearchableDb[], query: string): PromptEntity[] {
    const trimmedQuery = query.trim().toLowerCase();

    const toEntity = (item: PromptSearchableDb): PromptEntity => ({
      id: item.id,
      title: item.title,
      description: item.description,
    });

    if (trimmedQuery.length < this.MIN_QUERY_LENGTH) {
      return items.map(toEntity);
    }

    return items
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(trimmedQuery);
        const descriptionMatch = item.description.toLowerCase().includes(trimmedQuery);
        const templateMatch = item.templateText.toLowerCase().includes(trimmedQuery);

        return titleMatch || descriptionMatch || templateMatch;
      })
      .map(toEntity);
  },

  /**
   * Fetches all prompts directly from IndexedDB via Dexie liveQuery
   * and applies search filtering to the resulting stream.
   *
   * @param query - The search query string.
   * @returns Observable emitting filtered PromptEntity lists on database changes.
   */
  execute(query: string): Observable<PromptEntity[]> {
    return liveQuery(async () => {
      const prompts = await db.prompts.toArray();
      const contents = await db.promptContents.toArray();
      const contentMap = new Map(contents.map((c) => [c.promptId, c.templateText]));

      const searchableItems: PromptSearchableDb[] = prompts.map((p) => ({
        id: p.id ?? 0,
        title: p.title,
        description: p.description,
        templateText: contentMap.get(p.id ?? 0) ?? '',
      }));

      return this.filterInMemory(searchableItems, query);
    });
  },
};
