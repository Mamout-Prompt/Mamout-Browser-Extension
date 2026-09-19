import { TemplatizePromptUseCase } from '../../usecase/TemplatizePromptUseCase';
import { InteractivePromptViewer, type PromptSegment } from '../promptviewer/components/InteractivePromptViewer';
import './AddPromptScreen.css';

declare const chrome: any;

const DRAFT_STORAGE_KEY = 'mamout_add_prompt_draft';

interface AddPromptScreenProps {
  onBack: () => void;
  onSavePrompt: (title: string, description: string, templateText: string) => void;
  parseSegments: (text: string) => PromptSegment[];
}

interface DraftData {
  step: number;
  title: string;
  description: string;
  templateText: string;
  llmResponseJson: string;
}

const saveDraft = async (data: DraftData) => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [DRAFT_STORAGE_KEY]: data });
  } else {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  }
};

const loadDraft = async (): Promise<DraftData | null> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get(DRAFT_STORAGE_KEY);
    return res[DRAFT_STORAGE_KEY] || null;
  } else {
    const item = localStorage.getItem(DRAFT_STORAGE_KEY);
    return item ? JSON.parse(item) : null;
  }
};

const clearDraft = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.remove(DRAFT_STORAGE_KEY);
  } else {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }
};

export const AddPromptScreen: React.FC<AddPromptScreenProps> = ({
  onBack,
  onSavePrompt,
  parseSegments,
}) => {
  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [llmResponseJson, setLlmResponseJson] = useState('');
  const [isRawMode, setIsRawMode] = useState(true);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const draft = await loadDraft();
        if (draft) {
          setStep(draft.step || 1);
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setTemplateText(draft.templateText || '');
          setLlmResponseJson(draft.llmResponseJson || '');
        }
      } catch (e) {
        console.error('Errore nel caricamento della bozza:', e);
      } finally {
        setIsDraftLoaded(true);
      }
    };

    restoreDraft();
  }, []);

  useEffect(() => {
    if (!isDraftLoaded) return;

    saveDraft({
      step,
      title,
      description,
      templateText,
      llmResponseJson,
    });
  }, [step, title, description, templateText, llmResponseJson, isDraftLoaded]);

  const handleCopyMetaPrompt = () => {
    if (!templateText.trim()) return;
    const metaPrompt = TemplatizePromptUseCase.preparePromptForLlm(templateText);
    navigator.clipboard.writeText(metaPrompt);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleApplyLlmResponse = () => {
    if (!llmResponseJson.trim()) {
      setErrorMessage("Paste the LLM's JSON response first");
      return;
    }
    try {
      const parsedTemplate = TemplatizePromptUseCase.templatize(templateText, llmResponseJson);
      setTemplateText(parsedTemplate.rawTemplate);
      setStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(`Couldn't read that as JSON: ${message}`);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !templateText.trim()) {
      setErrorMessage('Title and prompt text cannot be empty');
      return;
    }
    await clearDraft();
    onSavePrompt(title, description, templateText);
  };

  const parsedSegments = parseSegments(templateText);

  if (!isDraftLoaded) {
    return null;
  }

  return (
    <div className="add-prompt-screen">
      <header className="add-prompt-header">
        <button className="icon-button" onClick={onBack} title="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2 className="header-title">Add Prompt - Step {step} of 3</h2>
      </header>

      <main className="add-prompt-content">
        {step === 1 && (
          <div className="step-container">
            <p className="step-description">Give your prompt a name and description.</p>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Code Refactoring Assistant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Short note about what this prompt does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-container">
            <h3 className="section-title">Paste your raw prompt below</h3>
            <p className="step-description">
              We will wrap it in a meta-prompt. Send it to an LLM (Gemini, Claude, GPT) to detect dynamic fields automatically.
            </p>

            <textarea
              className="form-textarea raw-prompt-area"
              rows={5}
              placeholder="e.g. Write an email to [name] about [topic]..."
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
            />

            <button
              className={`btn btn-secondary ${copyFeedback ? 'copied' : ''}`}
              onClick={handleCopyMetaPrompt}
              disabled={!templateText.trim()}
            >
              {copyFeedback ? 'Copied Meta-Prompt!' : 'Copy Meta-Prompt'}
            </button>

            <hr className="divider" />

            <h4 className="section-subtitle">Paste the JSON response from the LLM here:</h4>
            <textarea
              className="form-textarea json-response-area"
              rows={4}
              placeholder='Paste JSON response here (e.g. {"matches": [...]})'
              value={llmResponseJson}
              onChange={(e) => setLlmResponseJson(e.target.value)}
            />

            <button
              className="btn btn-primary"
              onClick={handleApplyLlmResponse}
              disabled={!llmResponseJson.trim()}
            >
              Apply AI Templatization & Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="step-container">
            <div className="step3-controls">
              <p className="step-description">Refine your prompt by adding or editing &lt;INPUT&gt; tags.</p>
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
            </div>

            {isRawMode ? (
              <textarea
                className="form-textarea full-editor"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                placeholder='Use <INPUT type="text">default</INPUT> for dynamic fields'
              />
            ) : (
              <div className="preview-container">
                <InteractivePromptViewer
                  segments={parsedSegments}
                  inputValues={inputValues}
                  onValueChange={(id, val) => setInputValues((prev) => ({ ...prev, [id]: val }))}
                  targetedInputIndex={-1}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="add-prompt-bottom-bar">
        {step > 1 ? (
          <button className="btn btn-text" onClick={() => setStep(step - 1)}>
            Previous
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !title.trim() : !templateText.trim()}
          >
            Next
          </button>
        ) : (
          <button className="btn btn-success" onClick={handleSave}>
            Save Prompt
          </button>
        )}
      </footer>

      {errorMessage && (
        <div className="dialog-overlay" onClick={() => setErrorMessage(null)}>
          <div className="dialog-card error-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title text-error">Error</h3>
            <p className="dialog-text">{errorMessage}</p>
            <div className="dialog-actions">
              <button className="btn btn-text" onClick={() => setErrorMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
