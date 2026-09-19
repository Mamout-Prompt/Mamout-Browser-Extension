import { type Prompt, PromptCard } from '../promptlist/components/PromptCard';
import { DeleteConfirmationDialog } from '../promptlist/components/DeleteConfirmationDialog';
import './SearchScreen.css';

export interface SearchUiState {
  query: string;
  results: Prompt[];
  isSearching: boolean;
  selectedPromptId?: number | null;
  promptToDeleteId: number | null;
  isDeleteDialogVisible: boolean;
}

interface SearchScreenProps {
  uiState: SearchUiState;
  onQueryChange: (query: string) => void;
  onBackClick: () => void;
  onPromptClick: (prompt: Prompt) => void;
  onDeleteRequested: (id: number) => void;
  onDeleteConfirmed: () => void;
  onDeleteDialogDismissed: () => void;
}

const EmptyStateIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 90,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 106.62 106.62"
    fill="none"
    className={className}
  >
    <path
      d="M53.31,3.31A50,50 0,0 0,34.06 7.16c1.49,3.63 5.04,6.15 9.25,6.15 5.58,0 10,-4.42 10,-10zM63.28,4.31c-0.51,10.13 -8.68,18.36 -18.78,18.96l39.24,44.17c-0.68,-2 -1.05,-4.14 -1.05,-6.36 0,-10.68 8.52,-19.5 19.1,-19.98a50,50 0,0 0,-2.3 -6.95c-3.2,2.18 -7.05,3.45 -11.18,3.45 -10.99,0 -20,-9.01 -20,-20 0,-3.99 1.19,-7.72 3.23,-10.85A50,50 0,0 0,63.28 4.31ZM80.48,11.34c-1.36,1.71 -2.17,3.88 -2.17,6.27 0,5.58 4.42,10 10,10 2.46,0 4.69,-0.86 6.42,-2.29A50,50 0,0 0,80.48 11.34ZM11.32,26.17a50,50 0,0 0,-8.01 27.14,50 50,0 0,0 50,50 50,50 0,0 0,4 -0.16c-0.51,-1.76 -0.79,-3.63 -0.79,-5.55 0,-5.45 2.22,-10.42 5.8,-14.04zM102.7,51.09c-5.58,0 -10,4.42 -10,10 0,4.7 3.14,8.58 7.46,9.68a50,50 0,0 0,3.15 -17.46,50 50,0 0,0 -0.05,-2.21c-0.19,-0.01 -0.37,-0.01 -0.56,-0.01zM94.14,79.14 L95.3,80.45a50,50 0,0 0,0.41 -0.64c-0.53,-0.2 -1.06,-0.42 -1.57,-0.67zM68.94,91.02c-1.52,1.75 -2.42,4.04 -2.42,6.57 0,1.33 0.25,2.59 0.7,3.74a50,50 0,0 0,8.1 -3.13z"
      stroke="currentColor"
      strokeWidth="6.61704"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="m11.08,5.78c1.98,-1.76 4.99,-1.58 6.75,0.4L95.73,93.87c1.76,1.98 1.58,4.99 -0.4,6.75 -1.98,1.76 -4.99,1.58 -6.75,-0.4L10.68,12.53c-1.76,-1.98 -1.58,-4.99 0.4,-6.75z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const SearchScreen: React.FC<SearchScreenProps> = ({
  uiState,
  onQueryChange,
  onBackClick,
  onPromptClick,
  onDeleteRequested,
  onDeleteConfirmed,
  onDeleteDialogDismissed,
}) => {
  return (
    <div className="search-screen">
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <button
            className="icon-button back-btn"
            onClick={onBackClick}
            title="Back"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <input
            type="text"
            className="search-input"
            placeholder="Search prompts..."
            value={uiState.query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
          />

          {uiState.query.length > 0 && (
            <button
              className="icon-button clear-btn"
              onClick={() => onQueryChange('')}
              title="Clear search"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <main className="search-content">
        {uiState.isDeleteDialogVisible && (
          <DeleteConfirmationDialog
            onConfirm={onDeleteConfirmed}
            onDismiss={onDeleteDialogDismissed}
          />
        )}

        {uiState.query.trim() === '' ? (
          <div className="center-container">
            <svg
              viewBox="0 0 24 24"
              width="64"
              height="64"
              fill="currentColor"
              className="search-prompt-icon"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p className="state-text">Search your prompts</p>
          </div>
        ) : uiState.results.length === 0 ? (
          <div className="center-container empty-state">
            <EmptyStateIcon size={90} className="empty-state-icon" />
            <p className="state-text">No results found</p>
          </div>
        ) : (
          <div className="prompt-cards-list">
            {uiState.results.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onPromptClick={() => onPromptClick(prompt)}
                onDeleteClick={() => onDeleteRequested(prompt.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
