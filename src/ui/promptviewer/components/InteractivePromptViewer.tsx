export interface PromptSegment {
  kind: 'static' | 'input';
  id?: string;
  text?: string;
  type?: 'text' | 'smallText' | 'options';
  defaultValue?: string;
  options?: string[];
}

interface InteractivePromptViewerProps {
  segments: PromptSegment[];
  inputValues: Record<string, string>;
  onValueChange: (id: string, newValue: string) => void;
  targetedInputIndex: number;
}

export const InteractivePromptViewer: React.FC<InteractivePromptViewerProps> = ({
  segments,
  inputValues,
  onValueChange,
  targetedInputIndex,
}) => {
  let inputCounter = 0;

  return (
    <div className="interactive-viewer">
      {segments.map((segment, index) => {
        if (segment.kind === 'static') {
          return (
            <span key={index} className="static-text-segment">
              {segment.text}
            </span>
          );
        }

        const currentIndex = inputCounter++;
        const isTargeted = currentIndex === targetedInputIndex;
        const fieldValue = inputValues[segment.id!] ?? segment.defaultValue ?? '';

        return (
          <div
            key={segment.id || index}
            id={`input-field-${currentIndex}`}
            className={`input-field-wrapper ${isTargeted ? 'targeted' : ''}`}
          >
            {segment.type === 'options' ? (
              <select
                className="viewer-select"
                value={fieldValue}
                onChange={(e) => onValueChange(segment.id!, e.target.value)}
              >
                {segment.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : segment.type === 'smallText' ? (
              <input
                type="text"
                className="viewer-input-small"
                value={fieldValue}
                onChange={(e) => onValueChange(segment.id!, e.target.value)}
                placeholder="Short input"
              />
            ) : (
              <textarea
                className="viewer-textarea"
                rows={3}
                value={fieldValue}
                onChange={(e) => onValueChange(segment.id!, e.target.value)}
                placeholder="Input field"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
