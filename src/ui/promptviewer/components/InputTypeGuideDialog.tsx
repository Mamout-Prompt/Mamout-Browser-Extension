interface InputTypeGuideDialogProps {
  onDismiss: () => void;
}

const GUIDE_CONFIGS = [
  {
    type: 'text',
    description: 'Multiline text field, ideal for longer content such as descriptions, detailed instructions, or paragraphs.',
    exampleCode: '<INPUT type="text">Your story...</INPUT>',
  },
  {
    type: 'smallText',
    description: 'Single-line text field, for short values like names, titles, or keywords.',
    exampleCode: '<INPUT type="smallText">John</INPUT>',
  },
  {
    type: 'options',
    description: 'Dropdown menu with predefined comma-separated values: the user picks instead of typing.',
    exampleCode: '<INPUT type="options" values="Red,Blue,Green">Blue</INPUT>',
  },
];

export const InputTypeGuideDialog: React.FC<InputTypeGuideDialogProps> = ({ onDismiss }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1200);
  };

  return (
    <div className="dialog-overlay" onClick={onDismiss}>
      <div className="dialog-card guide-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Input Guide</h3>
        <p className="guide-subtitle">
          Use dynamic <code>&lt;INPUT&gt;</code> tags to create interactive fields in your templates. The text between the tags is used as the default value.
        </p>

        <hr className="divider" />

        <div className="guide-list">
          {GUIDE_CONFIGS.map((item) => (
            <div key={item.type} className="guide-item">
              <span className="guide-type-label">{item.type}</span>
              <p className="guide-description">{item.description}</p>
              <div
                className="example-code-box"
                onClick={() => handleCopy(item.exampleCode, item.type)}
                title="Click to copy"
              >
                <code>{item.exampleCode}</code>
                <span className="copy-indicator">
                  {copiedType === item.type ? 'Copied!' : 'Copy'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-text" onClick={onDismiss}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
