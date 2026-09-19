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
  return await db.prompts.put(prompt);
}

/**
 * Inserts a new prompt content entry, replacing any existing content for the same `promptId`.
 *
 * @param content - The prompt content entity to insert.
 * @returns A promise that resolves to the primary key (`promptId`) of the inserted or replaced content record.
 */
export async function insertContent(content: PromptContentEntity): Promise<number> {
  return await db.promptContents.put(content);
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

  await db.prompts.put(prompt);
}

/**
 * Updates an existing prompt content entry in the database.
 *
 * @param content - The prompt content entity with updated template text.
 * @returns A promise that resolves when the update completes.
 */
export async function updateContent(content: PromptContentEntity): Promise<void> {
  await db.promptContents.put(content);
}

/**
 * Updates the template text for a specific prompt content record.
 *
 * @param promptId - The unique identifier of the prompt content to update.
 * @param templateText - The new raw template text to be stored.
 * @returns A promise that resolves when the update operation completes.
 */
export async function updatePromptContent(
  promptId: number,
  templateText: string
): Promise<void> {
  await db.promptContents.update(promptId, { templateText });
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
  await db.promptContents.put({
    promptId,
    templateText,
  });
}
/**
 * Inserts a new prompt header together with its content in a single atomic transaction.
 *
 * Wrapping both inserts in a transaction prevents a "ghost" prompt: without it, a crash
 * between the two inserts could leave a `PromptEntity` with no matching
 * `PromptContentEntity`, which would show up in `getPrompts` but silently disappear from
 * `getSearchablePrompts` / `getSearchablePromptById` due to their INNER JOIN logic
 *
 * @param prompt - The prompt header entity to insert.
 * @param templateText - The raw template text for the new prompt's content.
 * @returns A promise that resolves to the auto-generated primary key ID of the newly inserted prompt header.
 */
export async function insertPromptWithContent(
  prompt: PromptEntity,
  templateText: string
): Promise<number> {
  return await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    const promptId = await db.prompts.add(prompt);

    await db.promptContents.put({
      promptId,
      templateText,
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

  const promptId = prompt.id;

  await db.transaction('rw', [db.prompts, db.promptContents], async () => {
    await db.prompts.delete(promptId);
    await db.promptContents.delete(promptId);
  });
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
