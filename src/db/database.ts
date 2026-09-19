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
  }
}

/**
 * Singleton database instance for performing local data operations.
 */
export const db = new AppDatabase();
