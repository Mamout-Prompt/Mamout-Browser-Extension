export interface Prompt {
  id: number;
  title: string;
  description: string;
}

interface PromptCardProps {
  prompt: Prompt;
  onPromptClick: (id: number) => void;
  onDeleteClick: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onPromptClick,
  onDeleteClick,
}) => {
  return (
    <div
      className={`prompt-card`}
      onClick={() => onPromptClick(prompt.id)}
    >
      <div className="prompt-card-content">
        <h4 className="prompt-title">{prompt.title}</h4>
        <p className="prompt-description">{prompt.description}</p>
      </div>

      <button
        className="icon-button delete-btn"
        title="Delete prompt"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
    </div>
  );
};
