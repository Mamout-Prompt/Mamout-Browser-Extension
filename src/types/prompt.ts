/**
 * Represents the lightweight metadata header for a prompt stored in the database.
 */
export interface PromptEntity {
  /**
   * The unique auto-incrementing identifier for the prompt.
   * Optional when creating a new record prior to database insertion.
   */
  id?: number;

  /**
   * The display title of the prompt shown in the user interface.
   */
  title: string;

  /**
   * A short summary or descriptive overview of the prompt.
   */
  description: string;
}

/**
 * Represents the detailed template content associated with a specific prompt entity.
 */
export interface PromptContentEntity {
  /**
   * The primary key and foreign key referencing the associated prompt's unique identifier.
   */
  promptId: number;

  /**
   * The raw text content of the prompt template, including dynamic input tags.
   */
  templateText: string;
}

/**
 * Database projection combining prompt metadata with its raw template text for search indexing and queries.
 */
export interface PromptSearchableDb {
  /**
   * The unique identifier matching the parent prompt.
   */
  id: number;

  /**
   * The display title of the prompt.
   */
  title: string;

  /**
   * A short summary or descriptive overview of the prompt.
   */
  description: string;

  /**
   * The joined raw template content text used for search filtering.
   */
  templateText: string;
}
