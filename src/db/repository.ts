import { liveQuery, type Observable } from 'dexie';
import { db } from './database';
import type {
  PromptEntity,
  PromptContentEntity,
  PromptSearchableDb,
} from '../types/prompt';

/**
 * Inserts a new prompt header into the database.
 * Replaces any existing record with the same primary key.
 *
 * @param prompt - The prompt metadata entity to insert.
 * @returns A promise that resolves to the auto-generated or inserted primary key ID.
 */
export async function insertPrompt(prompt: PromptEntity): Promise<number> {
  const entity: PromptEntity = {
    ...prompt,
    lastModified: prompt.lastModified ?? Date.now(),
  };
  return await db.prompts.put(entity);
}

/**
 * Inserts a new prompt content entry, replacing any existing content for the same `promptId`.
 *
 * @param content - The prompt content entity to insert.
 * @returns A promise that resolves to the primary key (`promptId`) of the inserted or replaced content record.
 */
export async function insertContent(content: PromptContentEntity): Promise<number> {
  const entity: PromptContentEntity = {
    ...content,
    lastModified: content.lastModified ?? Date.now(),
  };
  return await db.promptContents.put(entity);
}

/**
 * Retrieves all prompt headers as a reactive observable stream.
 * Emits an updated list whenever the `prompts` table changes.
 *
 * @returns An observable stream emitting the list of all `PromptEntity` records.
 */
export function getPrompts(): Observable<PromptEntity[]> {
  return liveQuery(() => db.prompts.toArray());
}

/**
 * Retrieves the content for a specific prompt ID as a reactive observable stream.
 *
 * @param promptId - The unique identifier of the target prompt.
 * @returns An observable stream emitting the `PromptContentEntity` if found, or `undefined`.
 */
export function getPromptContent(
  promptId: number
): Observable<PromptContentEntity | undefined> {
  return liveQuery(() => db.promptContents.get(promptId));
}

/**
 * Retrieves all prompts joined with their template content as a reactive observable stream.
 *
 * @returns An observable stream emitting an array of `PromptSearchableDb` database projections.
 */
export function getSearchablePrompts(): Observable<PromptSearchableDb[]> {
  return liveQuery(async () => {
    const prompts = await db.prompts.toArray();

    const results = await Promise.all(
      prompts.map(async (prompt) => {
        if (prompt.id === undefined) return null;

        const content = await db.promptContents.get(prompt.id);
        if (!content) return null;

        return {
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          templateText: content.templateText,
          lastModified: prompt.lastModified ?? content.lastModified ?? Date.now(),
        };
      })
    );

    return results.filter((item): item is PromptSearchableDb => item !== null);
  });
}

/**
 * Retrieves a single searchable prompt database projection as a reactive observable stream.
 *
 * @param promptId - The unique identifier of the prompt to retrieve.
 * @returns An observable stream emitting the matching `PromptSearchableDb` entry, or `undefined` if not found.
 */
export function getSearchablePromptById(
  promptId: number
): Observable<PromptSearchableDb | undefined> {
  return liveQuery(async () => {
    const prompt = await db.prompts.get(promptId);
    if (!prompt || prompt.id === undefined) return undefined;

    const content = await db.promptContents.get(promptId);
    if (!content) return undefined;

    return {
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      templateText: content.templateText,
      lastModified: prompt.lastModified ?? content.lastModified ?? Date.now(),
    };
  });
}

/**
 * Updates an existing prompt header in the database.
 *
 * @param prompt - The prompt entity with updated fields. Must contain a valid `id`.
 * @returns A promise that resolves when the update completes.
 */
export async function updatePrompt(prompt: PromptEntity): Promise<void> {
  if (prompt.id === undefined) {
    throw new Error('Cannot update prompt header: Missing entity primary key ID.');
  }

  const entity: PromptEntity = {
    ...prompt,
    lastModified: Date.now(),
  };

  await db.prompts.put(entity);
}

/**
 * Updates an existing prompt content entry in the database.
 *
 * @param content - The prompt content entity with updated template text.
 * @returns A promise that resolves when the update completes.
 */
export async function updateContent(content: PromptContentEntity): Promise<void> {
  const entity: PromptContentEntity = {
    ...content,
    lastModified: Date.now(),
  };

  await db.promptContents.put(entity);
}

/**
 * Updates the template text for a specific prompt content record and updates `lastModified`.
 *
 * @param promptId - The unique identifier of the prompt content to update.
 * @param templateText - The new raw template text to be stored.
 * @returns A promise that resolves when the update operation completes.
 */
export async function updatePromptContent(
  promptId: number,
  templateText: string
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    await db.promptContents.update(promptId, { templateText, lastModified: now });
    await db.prompts.update(promptId, { lastModified: now });
  });
}

/**
 * Inserts a new prompt content entry or replaces the existing one if a conflict occurs.
 *
 * @param promptId - The unique identifier of the prompt content.
 * @param templateText - The raw template text to insert or replace.
 * @returns A promise that resolves when the upsert operation completes.
 */
export async function upsertPromptContent(
  promptId: number,
  templateText: string
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    await db.promptContents.put({
      promptId,
      templateText,
      lastModified: now,
    });
    await db.prompts.update(promptId, { lastModified: now });
  });
}

/**
 * Inserts a new prompt header together with its content in a single atomic transaction.
 *
 * @param prompt - The prompt header entity to insert.
 * @param templateText - The raw template text for the new prompt's content.
 * @returns A promise that resolves to the auto-generated primary key ID of the newly inserted prompt header.
 */
export async function insertPromptWithContent(
  prompt: PromptEntity,
  templateText: string
): Promise<number> {
  const now = Date.now();

  return await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    const promptId = await db.prompts.add({
      ...prompt,
      lastModified: prompt.lastModified ?? now,
    });

    await db.promptContents.put({
      promptId,
      templateText,
      lastModified: now,
    });

    return promptId;
  });
}

/**
 * Deletes a prompt header and explicitly cascades deletion to its associated template content.
 *
 * @param prompt - The prompt header entity to delete. Must contain a valid `id`.
 * @returns A promise that resolves when the deletion operation completes.
 */
export async function deletePrompt(prompt: PromptEntity): Promise<void> {
  if (prompt.id === undefined) {
    throw new Error('Cannot delete prompt header: Missing entity primary key ID.');
  }

  await deletePromptById(prompt.id);
}

/**
 * Deletes a prompt header by its ID and cascades the deletion to its associated template content.
 *
 * @param promptId - The unique identifier of the prompt to delete.
 * @returns A promise that resolves when the cascade deletion completes.
 */
export async function deletePromptById(promptId: number): Promise<void> {
  await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    await db.prompts.delete(promptId);
    await db.promptContents.delete(promptId);
  });
}

/**
 * Retrieves all searchable prompt projections synchronously as a direct Promise array (non-observable).
 *
 * @returns A promise resolving to an array of all `PromptSearchableDb` database projections.
 */
export async function getSearchablePromptsSync(): Promise<PromptSearchableDb[]> {
  const prompts = await db.prompts.toArray();

  const results = await Promise.all(
    prompts.map(async (prompt) => {
      if (prompt.id === undefined) return null;

      const content = await db.promptContents.get(prompt.id);
      if (!content) return null;

      return {
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        templateText: content.templateText,
        lastModified: prompt.lastModified ?? content.lastModified ?? Date.now(),
      };
    })
  );

  return results.filter((item): item is PromptSearchableDb => item !== null);
}

/**
 * Alias for `getSearchablePromptsSync`.
 * Retrieves all searchable prompts directly as a Promise array.
 *
 * @returns A promise resolving to an array of all `PromptSearchableDb` database projections.
 */
export async function getAllPromptsSync(): Promise<PromptSearchableDb[]> {
  return await getSearchablePromptsSync();
}

/**
 * Retrieves a single searchable prompt database projection matching a specific title and description.
 *
 * @param title - The display title of the target prompt.
 * @param description - The description overview of the target prompt.
 * @returns A promise resolving to the matching `PromptSearchableDb` projection, or `undefined` if not found.
 */
export async function getSearchablePromptByTitleAndDescription(
  title: string,
  description: string
): Promise<PromptSearchableDb | undefined> {
  const prompt = await db.prompts
    .where('title')
    .equals(title)
    .filter((p) => p.description === description)
    .first();

  if (!prompt || prompt.id === undefined) return undefined;

  const content = await db.promptContents.get(prompt.id);
  if (!content) return undefined;

  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    templateText: content.templateText,
    lastModified: prompt.lastModified ?? content.lastModified ?? Date.now(),
  };
}

/**
 * Updates a prompt header details and content in a single atomic transaction.
 *
 * @param promptId - The unique identifier of the prompt to update.
 * @param title - The new title string.
 * @param description - The new description string.
 * @param templateText - The new raw template text.
 * @param lastModified - Optional epoch timestamp (defaults to current time).
 * @returns A promise that resolves when the update completes.
 */
export async function updatePromptWithContent(
  promptId: number,
  title: string,
  description: string,
  templateText: string,
  lastModified: number = Date.now()
): Promise<void> {
  await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    await db.prompts.update(promptId, {
      title,
      description,
      lastModified,
    });
    await db.promptContents.put({
      promptId,
      templateText,
      lastModified,
    });
  });
}

/**
 * Synchronizes an incoming list of prompts with the local database based on `lastModified` timestamps.
 * Updates local prompts if incoming data is newer; otherwise inserts new entries atomically.
 *
 * @param prompts - List of incoming searchable prompt projections to sync.
 * @returns A promise that resolves when the synchronization operation completes.
 */
export async function syncPrompts(
  prompts: PromptSearchableDb[]
): Promise<void> {
  for (const incoming of prompts) {
    const existing = await getSearchablePromptByTitleAndDescription(
      incoming.title,
      incoming.description
    );

    if (existing) {
      if (incoming.lastModified > existing.lastModified) {
        await updatePromptWithContent(
          existing.id,
          incoming.title,
          incoming.description,
          incoming.templateText,
          incoming.lastModified
        );
      }
    } else {
      await insertPromptWithContent(
        {
          title: incoming.title,
          description: incoming.description,
          lastModified: incoming.lastModified,
        },
        incoming.templateText
      );
    }
  }
}
