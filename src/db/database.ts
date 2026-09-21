import Dexie, { type Table } from 'dexie';
import type { PromptEntity, PromptContentEntity } from '../types/prompt';

/**
 * Local IndexedDB database manager powered by Dexie.js.
 * Handles persistent client-side storage for prompts and template content.
 */
export class AppDatabase extends Dexie {
  /**
   * Table storing lightweight prompt metadata headers.
   */
  prompts!: Table<PromptEntity, number>;

  /**
   * Table storing heavy template content mapped by prompt ID.
   */
  promptContents!: Table<PromptContentEntity, number>;

  /**
   * Initializes the database instance and defines table schema versions.
   */
  constructor() {
    super('mamout_database');

    this.version(1).stores({
      prompts: '++id, title',
      promptContents: 'promptId',
    });

    this.version(2)
      .stores({
        prompts: '++id, title, lastModified',
        promptContents: 'promptId, lastModified',
      })
      .upgrade(async (tx) => {
        const now = Date.now();

        await tx
          .table<PromptEntity>('prompts')
          .toCollection()
          .modify((prompt) => {
            if (!prompt.lastModified) {
              prompt.lastModified = now;
            }
          });

        await tx
          .table<PromptContentEntity>('promptContents')
          .toCollection()
          .modify((content) => {
            if (!content.lastModified) {
              content.lastModified = now;
            }
          });
      });
  }
}

/**
 * Singleton database instance for performing local data operations.
 */
export const db = new AppDatabase();
