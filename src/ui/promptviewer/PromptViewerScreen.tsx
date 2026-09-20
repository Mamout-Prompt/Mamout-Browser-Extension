import React, { useState } from 'react';
import { InteractivePromptViewer, type PromptSegment } from './components/InteractivePromptViewer';
import { InputTypeGuideDialog } from './components/InputTypeGuideDialog';
import './PromptViewerScreen.css';

interface PromptViewerScreenProps {
  templateText: string;
  onTemplateTextChange: (newText: string) => void;
  parsedSegments: PromptSegment[];
  inputValues: Record<string, string>;
  onInputValueChange: (id: string, newValue: string) => void;
}

export const PromptViewerScreen: React.FC<PromptViewerScreenProps> = ({
  templateText,
  onTemplateTextChange,
  parsedSegments,
  inputValues,
  onInputValueChange,
}) => {
  const [isRawMode, setIsRawMode] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [targetedInputIndex, setTargetedInputIndex] = useState(-1);

  const inputSegments = parsedSegments.filter((s) => s.kind === 'input');
  const hasInputs = inputSegments.length > 0;

  const handleNavigateNextInput = () => {
    if (!hasInputs) return;
    const nextIndex = (targetedInputIndex + 1) % inputSegments.length;
    setTargetedInputIndex(nextIndex);

    const targetWrapper = document.getElementById(`input-field-${nextIndex}`);
    if (targetWrapper) {
      const inputEl = targetWrapper.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input, textarea, select'
      );
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleInsertTag = (type: string) => {
    let tagToInsert = '<INPUT type="text">default</INPUT>';
    if (type === 'smallText') tagToInsert = '<INPUT type="smallText">John</INPUT>';
    if (type === 'options') tagToInsert = '<INPUT type="options" values="Red,Blue">Red</INPUT>';

    onTemplateTextChange(templateText + tagToInsert);
  };

  return (
    <div className="prompt-viewer-screen">
      <div className="viewer-controls-bar">
        <button className="btn-toggle-mode" onClick={() => setIsRawMode(!isRawMode)}>
          {isRawMode ? (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span>View Preview</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              <span>Edit Raw</span>
            </>
          )}
        </button>

        {isRawMode && (
          <button
            className="icon-button info-btn"
            onClick={() => setShowGuideDialog(true)}
            title="Open Input Guide"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </button>
        )}
      </div>

      <main className="viewer-content">
        {isRawMode ? (
          <div className="raw-editor-container">
            <textarea
              className="raw-textarea"
              value={templateText}
              onChange={(e) => onTemplateTextChange(e.target.value)}
              placeholder='Use <INPUT type="...">default</INPUT> for dynamic fields'
            />

            <div className="suggestions-chip-bar">
              <button className="chip" onClick={() => handleInsertTag('text')}>
                + Long Text
              </button>
              <button className="chip" onClick={() => handleInsertTag('smallText')}>
                + Short Text
              </button>
              <button className="chip" onClick={() => handleInsertTag('options')}>
                + Options
              </button>
            </div>
          </div>
        ) : (
          <InteractivePromptViewer
            segments={parsedSegments}
            inputValues={inputValues}
            onValueChange={onInputValueChange}
            targetedInputIndex={targetedInputIndex}
          />
        )}
      </main>

      {!isRawMode && hasInputs && (
        <button className="fab-nav-button" onClick={handleNavigateNextInput} title="Next field">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </button>
      )}

      {showGuideDialog && (
        <InputTypeGuideDialog onDismiss={() => setShowGuideDialog(false)} />
      )}
    </div>
  );
};
