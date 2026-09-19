interface PromptDetailTopBarProps {
  title: string;
  onBackClick: () => void;
  onEditHeaderClick: () => void;
  onSaveClick: () => void;
  onCopyClick: () => void;
}

export const PromptDetailTopBar: React.FC<PromptDetailTopBarProps> = ({
  title,
  onBackClick,
  onEditHeaderClick,
  onSaveClick,
  onCopyClick,
}) => {
  return (
    <header className="prompt-detail-top-bar">
      <div className="top-bar-left">
        <button className="icon-button" onClick={onBackClick} title="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2 className="top-bar-title" title={title}>
          {title}
        </h2>
      </div>

      <div className="top-bar-actions">
        <button className="icon-button" onClick={onEditHeaderClick} title="Edit Title and Description">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
        <button className="icon-button" onClick={onSaveClick} title="Save Prompt">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
          </svg>
        </button>
        <button className="icon-button" onClick={onCopyClick} title="Copy Compiled Prompt">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
