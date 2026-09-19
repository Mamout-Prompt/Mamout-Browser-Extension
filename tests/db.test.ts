import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Observable } from 'dexie';
import { db } from '../src/db/database';
import {
  insertPromptWithContent,
  getSearchablePrompts,
  getSearchablePromptById,
  updatePrompt,
  updatePromptContent,
  deletePromptById,
} from '../src/db/repository';

/**
 * Utility helper to convert a Dexie liveQuery Observable into a Promise
 * resolving with its first emitted value.
 */
function firstValueFrom<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next: (value: T) => {
        resolve(value);
        subscription.unsubscribe();
      },
      error: (err: unknown) => {
        reject(err);
      },
    });
  });
}

describe('Database & Repository Suite', () => {
  beforeEach(async () => {
    await db.prompts.clear();
    await db.promptContents.clear();
  });

  it('should insert a prompt with content atomically', async () => {
    const id = await insertPromptWithContent(
      {
        title: 'Email Generator',
        description: 'Generates formal emails',
      },
      'Write an email to <INPUT type="text">Name</INPUT>'
    );

    expect(id).toBeGreaterThan(0);

    const searchable = await firstValueFrom(getSearchablePromptById(id));
    expect(searchable).toBeDefined();
    expect(searchable?.title).toBe('Email Generator');
    expect(searchable?.templateText).toBe('Write an email to <INPUT type="text">Name</INPUT>');
  });

  it('should retrieve all searchable prompts', async () => {
    await insertPromptWithContent(
      { title: 'Title 1', description: 'Desc 1' },
      'Template 1'
    );
    await insertPromptWithContent(
      { title: 'Title 2', description: 'Desc 2' },
      'Template 2'
    );

    const prompts = await firstValueFrom(getSearchablePrompts());
    expect(prompts).toHaveLength(2);
  });

  it('should update prompt metadata and template content', async () => {
    const id = await insertPromptWithContent(
      { title: 'Old Title', description: 'Old Desc' },
      'Old Content'
    );

    await updatePrompt({
      id,
      title: 'New Title',
      description: 'New Desc',
    });
    await updatePromptContent(id, 'New Content');

    const updated = await firstValueFrom(getSearchablePromptById(id));
    expect(updated?.title).toBe('New Title');
    expect(updated?.templateText).toBe('New Content');
  });

  it('should delete prompt and cascade delete content', async () => {
    const id = await insertPromptWithContent(
      { title: 'Title', description: 'Desc' },
      'Content'
    );

    await deletePromptById(id);

    const searchable = await firstValueFrom(getSearchablePromptById(id));
    expect(searchable).toBeUndefined();

    const rawContent = await db.promptContents.get(id);
    expect(rawContent).toBeUndefined();
  });
});
