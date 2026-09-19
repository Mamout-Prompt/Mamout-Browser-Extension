import { PromptDetailTopBar } from './components/PromptDetailTopBar';
import { EditHeaderDialog } from './components/EditHeaderDialog';
import { PromptViewerScreen } from '../promptviewer/PromptViewerScreen';
import { type PromptSegment } from '../promptviewer/components/InteractivePromptViewer';
import './PromptDetailScreen.css';

interface PromptDetailScreenProps {
  promptId: number;
  initialTitle: string;
  initialDescription: string;
  rawTemplateText: string;
  parsedSegments?: PromptSegment[];
  onBackClick: () => void;
  onSavePrompt: (id: number, title: string, description: string, templateText: string) => void;
}

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentSegments = useMemo(() => {
    return parsePromptSegments(templateText);
  }, [templateText]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSave = () => {
    onSavePrompt(promptId, title, description, templateText);
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

  return (
    <div className="prompt-detail-screen">
      <PromptDetailTopBar
        title={title}
        onBackClick={onBackClick}
        onEditHeaderClick={() => setIsEditingHeader(true)}
        onSaveClick={handleSave}
        onCopyClick={handleCopyCompiled}
      />

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

      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
};
