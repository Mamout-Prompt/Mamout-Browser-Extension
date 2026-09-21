import { PromptDetailTopBar } from './components/PromptDetailTopBar';
import { EditHeaderDialog } from './components/EditHeaderDialog';
import { PromptViewerScreen } from '../promptviewer/PromptViewerScreen';
import { type PromptSegment } from '../promptviewer/components/InteractivePromptViewer';
import { SyncClient, type ConnectionState } from '../../sync/SyncClient';
import { SyncModal } from '../sync/SyncModal';
import './PromptDetailScreen.css';

declare const chrome: any;

interface PromptDetailScreenProps {
  promptId: number;
  initialTitle: string;
  initialDescription: string;
  rawTemplateText: string;
  parsedSegments?: PromptSegment[];
  onBackClick: () => void;
  onSavePrompt: (id: number, title: string, description: string, templateText: string) => void;
}

interface EditDraftData {
  title: string;
  description: string;
  templateText: string;
  inputValues: Record<string, string>;
}

const getDraftKey = (promptId: number) => `mamout_edit_prompt_draft_${promptId}`;

const saveEditDraft = async (promptId: number, data: EditDraftData) => {
  const key = getDraftKey(promptId);
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [key]: data });
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const loadEditDraft = async (promptId: number): Promise<EditDraftData | null> => {
  const key = getDraftKey(promptId);
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get(key);
    return res[key] || null;
  } else {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
};

const clearEditDraft = async (promptId: number) => {
  const key = getDraftKey(promptId);
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.remove(key);
  } else {
    localStorage.removeItem(key);
  }
};

export const parsePromptSegments = (text: string): PromptSegment[] => {
  const segments: PromptSegment[] = [];
  const regex = /<INPUT\s+[^>]*type="([^"]+)"[^>]*>(?:(?!<INPUT).)*?<\/INPUT>/gis;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let inputCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: 'static',
        text: text.substring(lastIndex, match.index),
      });
    }

    const fullTag = match[0];
    const typeAttr = match[1] ? match[1].toLowerCase() : 'text';
    let type: 'text' | 'smallText' | 'options' = 'text';
    if (typeAttr === 'smalltext') type = 'smallText';
    if (typeAttr === 'options') type = 'options';

    const valuesMatch = fullTag.match(/values="([^"]+)"/i);
    const options = valuesMatch && valuesMatch[1]
      ? valuesMatch[1].split(',').map((s) => s.trim())
      : [];

    const contentMatch = fullTag.match(/>([\s\S]*?)<\/INPUT>/i);
    const defaultValue = contentMatch?.[1] ?? '';

    inputCounter++;
    segments.push({
      kind: 'input',
      id: `input_${inputCounter}`,
      type,
      defaultValue,
      options,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      kind: 'static',
      text: text.substring(lastIndex),
    });
  }

  return segments;
};

export const compilePromptText = (rawText: string, inputValues: Record<string, string>): string => {
  const regex = /<INPUT\s+[^>]*>(?:(?!<INPUT).)*?<\/INPUT>/gis;
  let counter = 0;

  return rawText.replace(regex, (fullTag) => {
    counter++;
    const id = `input_${counter}`;
    if (inputValues[id] !== undefined && inputValues[id] !== '') {
      return inputValues[id];
    }
    const contentMatch = fullTag.match(/>([\s\S]*?)<\/INPUT>/i);
    return contentMatch?.[1] ?? '';
  });
};

export const PromptDetailScreen: React.FC<PromptDetailScreenProps> = ({
  promptId,
  initialTitle,
  initialDescription,
  rawTemplateText,
  onBackClick,
  onSavePrompt,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [templateText, setTemplateText] = useState(rawTemplateText);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncState, setSyncState] = useState<ConnectionState>(SyncClient.getState());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const restoreDraft = async () => {
      try {
        const draft = await loadEditDraft(promptId);
        if (isMounted) {
          if (draft) {
            setTitle(draft.title ?? initialTitle);
            setDescription(draft.description ?? initialDescription);
            setTemplateText(draft.templateText ?? rawTemplateText);
            setInputValues(draft.inputValues ?? {});
          } else {
            setTitle(initialTitle);
            setDescription(initialDescription);
            setTemplateText(rawTemplateText);
            setInputValues({});
          }
        }
      } catch (e) {
        console.error('Error loading edit draft:', e);
      } finally {
        if (isMounted) setIsDraftLoaded(true);
      }
    };

    restoreDraft();
    return () => {
      isMounted = false;
    };
  }, [promptId]);

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setTemplateText(rawTemplateText);
    clearEditDraft(promptId);
  }, [promptId, initialTitle, initialDescription, rawTemplateText]);

  useEffect(() => {
    if (!isDraftLoaded) return;

    saveEditDraft(promptId, {
      title,
      description,
      templateText,
      inputValues,
    });
  }, [promptId, title, description, templateText, inputValues, isDraftLoaded]);

  useEffect(() => {
    const unsubscribe = SyncClient.subscribeState((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const currentSegments = useMemo(() => {
    return parsePromptSegments(templateText);
  }, [templateText]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSave = async () => {
    await clearEditDraft(promptId);
    onSavePrompt(promptId, title, description, templateText);
    SyncClient.syncAll();
    showToast('Saved!');
  };

  const handleInputValueChange = (id: string, newValue: string) => {
    setInputValues((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleCopyCompiled = () => {
    const compiled = compilePromptText(templateText, inputValues);
    navigator.clipboard.writeText(compiled);
    showToast('Copied to clipboard!');
  };

  if (!isDraftLoaded) {
    return null;
  }

  return (
    <div className="prompt-detail-screen">
      <PromptDetailTopBar
        title={title}
        onBackClick={onBackClick}
        onEditHeaderClick={() => setIsEditingHeader(true)}
        onSaveClick={handleSave}
        onCopyClick={handleCopyCompiled}
      />

      {syncState.type === 'connected' && (
        <div className="sync-status-banner">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="sync-banner-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="sync-banner-text">Synchronized with {syncState.url}</span>
        </div>
      )}

      <div className="prompt-detail-content">
        <PromptViewerScreen
          templateText={templateText}
          onTemplateTextChange={setTemplateText}
          parsedSegments={currentSegments}
          inputValues={inputValues}
          onInputValueChange={handleInputValueChange}
        />
      </div>

      {isEditingHeader && (
        <EditHeaderDialog
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onDismiss={() => setIsEditingHeader(false)}
        />
      )}

      {showSyncModal && <SyncModal onDismiss={() => setShowSyncModal(false)} />}

      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
};
