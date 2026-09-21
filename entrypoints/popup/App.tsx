import { MamoutTheme } from '../../src/ui/theme/Theme';
import { PromptListScreen, type PromptListUiState } from '../../src/ui/promptlist/PromptListScreen';
import { SearchScreen, type SearchUiState } from '../../src/ui/search/SearchScreen';
import { PromptDetailScreen } from '../../src/ui/promptdetail/PromptDetailScreen';
import { AddPromptScreen } from '../../src/ui/addprompt/AddPromptScreen';
import { type PromptSegment } from '../../src/ui/promptviewer/components/InteractivePromptViewer';
import { SyncClient } from '../../src/sync/SyncClient';

import {
  getSearchablePrompts,
  insertPromptWithContent,
  updatePromptWithContent,
  deletePromptById,
} from '../../src/db/repository';
import type { PromptSearchableDb } from '../../src/types/prompt';

declare const chrome: any;

export type ScreenType = 'home' | 'search' | 'viewer' | 'addPrompt';

const STORAGE_STATE_KEY = 'mamout_extension_ui_state';

const saveUiState = async (screen: ScreenType, activePromptId: number | null) => {
  const stateToSave = { screen, activePromptId };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [STORAGE_STATE_KEY]: stateToSave });
  } else {
    localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(stateToSave));
  }
};

const loadUiState = async (): Promise<{ screen: ScreenType; activePromptId: number | null } | null> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get(STORAGE_STATE_KEY);
    return res[STORAGE_STATE_KEY] || null;
  } else {
    const item = localStorage.getItem(STORAGE_STATE_KEY);
    return item ? JSON.parse(item) : null;
  }
};

const parsePromptSegments = (text: string): PromptSegment[] => {
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

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [prompts, setPrompts] = useState<PromptSearchableDb[]>([]);
  const [activePrompt, setActivePrompt] = useState<PromptSearchableDb | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [homeSelectedId, setHomeSelectedId] = useState<number | null>(null);
  const [isHomeDeleteVisible, setIsHomeDeleteVisible] = useState(false);

  const [searchState, setSearchState] = useState<SearchUiState>({
    query: '',
    results: [],
    isSearching: false,
    selectedPromptId: null,
    promptToDeleteId: null,
    isDeleteDialogVisible: false,
  });

  useEffect(() => {
  const subscription = getSearchablePrompts().subscribe({
    next: (data) => {
      setPrompts(data);

      setActivePrompt((prevActive) => {
        if (!prevActive) return null;
        const updated = data.find((p) => p.id === prevActive.id);
        return updated || prevActive;
      });
    },
    error: (err) => console.error('Error loading prompts:', err),
  });

  return () => subscription.unsubscribe();
}, []);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await loadUiState();
        if (savedState) {
          setCurrentScreen(savedState.screen);
          if (savedState.activePromptId !== null) {
            const found = prompts.find((p) => p.id === savedState.activePromptId);
            if (found) {
              setActivePrompt(found);
            }
          }
        }
      } catch (e) {
        console.error('Error restoring UI state:', e);
      } finally {
        setIsInitialized(true);
      }
    };

    restoreState();
  }, [prompts.length]);

  const navigateTo = (screen: ScreenType, prompt: PromptSearchableDb | null = activePrompt) => {
    setCurrentScreen(screen);
    setActivePrompt(prompt);
    saveUiState(screen, prompt ? prompt.id : null);
  };

  const handleOpenPromptViewer = (prompt: PromptSearchableDb) => {
    navigateTo('viewer', prompt);
  };

  const handleSearchQueryChange = (query: string) => {
    const filtered = prompts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()) ||
          p.templateText.toLowerCase().includes(query.toLowerCase())
      )
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || p.templateText,
      }));

    setSearchState((prev) => ({
      ...prev,
      query,
      results: filtered,
    }));
  };

  const handleOpenSearch = () => {
    handleSearchQueryChange('');
    navigateTo('search');
  };

  const handleSearchDeleteRequested = (id: number) => {
    setSearchState((prev) => ({
      ...prev,
      promptToDeleteId: id,
      isDeleteDialogVisible: true,
    }));
  };

  const handleSearchDeleteConfirmed = async () => {
    if (searchState.promptToDeleteId !== null) {
      const idToDelete = searchState.promptToDeleteId;
      await deletePromptById(idToDelete);

      setSearchState((prev) => ({
        ...prev,
        results: prev.results.filter((p) => p.id !== idToDelete),
        selectedPromptId: null,
        promptToDeleteId: null,
        isDeleteDialogVisible: false,
      }));

      if (activePrompt?.id === idToDelete) {
        setActivePrompt(null);
      }

      SyncClient.syncAll();
    }
  };

  const handleHomeDeleteConfirmed = async () => {
    if (homeSelectedId !== null) {
      await deletePromptById(homeSelectedId);
      setHomeSelectedId(null);
      setIsHomeDeleteVisible(false);

      if (activePrompt?.id === homeSelectedId) {
        setActivePrompt(null);
      }

      SyncClient.syncAll();
    }
  };

  const homeUiState: PromptListUiState =
    prompts.length === 0
      ? { type: 'empty' }
      : {
          type: 'success',
          prompts: prompts.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description || p.templateText,
          })),
          selectedPromptId: homeSelectedId,
          isDeleteDialogVisible: isHomeDeleteVisible,
        };

  if (!isInitialized) {
    return null;
  }

  return (
    <MamoutTheme>
      {currentScreen === 'home' && (
        <PromptListScreen
          uiState={homeUiState}
          onSearchClick={handleOpenSearch}
          onPromptClick={(id) => {
            if (homeSelectedId !== null) {
              setHomeSelectedId(null);
            } else {
              const selected = prompts.find((p) => p.id === id);
              if (selected) handleOpenPromptViewer(selected);
            }
          }}
          onDeleteRequested={(id) => {
            if (id) setHomeSelectedId(id);
            setIsHomeDeleteVisible(true);
          }}
          onDeleteDialogDismissed={() => setIsHomeDeleteVisible(false)}
          onDeleteConfirmed={handleHomeDeleteConfirmed}
          onAddPromptClick={() => navigateTo('addPrompt')}
        />
      )}

      {currentScreen === 'search' && (
        <SearchScreen
          uiState={searchState}
          onQueryChange={handleSearchQueryChange}
          onBackClick={() => navigateTo('home')}
          onPromptClick={(prompt) => {
            const found = prompts.find((p) => p.id === prompt.id);
            if (found) handleOpenPromptViewer(found);
          }}
          onDeleteRequested={handleSearchDeleteRequested}
          onDeleteConfirmed={handleSearchDeleteConfirmed}
          onDeleteDialogDismissed={() =>
            setSearchState((prev) => ({ ...prev, isDeleteDialogVisible: false }))
          }
        />
      )}

      {currentScreen === 'viewer' && activePrompt && (
        <PromptDetailScreen
          promptId={activePrompt.id}
          initialTitle={activePrompt.title}
          initialDescription={activePrompt.description}
          rawTemplateText={activePrompt.templateText || activePrompt.description}
          onBackClick={() => navigateTo('home')}
          onSavePrompt={async (id, updatedTitle, updatedDesc, updatedText) => {
            const now = Date.now();
            await updatePromptWithContent(id, updatedTitle, updatedDesc, updatedText, now);

            const updatedObj: PromptSearchableDb = {
              id,
              title: updatedTitle,
              description: updatedDesc,
              templateText: updatedText,
              lastModified: now,
            };
            setActivePrompt(updatedObj);

            SyncClient.syncAll();
          }}
        />
      )}

      {currentScreen === 'addPrompt' && (
        <AddPromptScreen
          onBack={() => navigateTo('home')}
          parseSegments={parsePromptSegments}
          onSavePrompt={async (newTitle, newDesc, newTemplateText) => {
            await insertPromptWithContent(
              { title: newTitle, description: newDesc },
              newTemplateText
            );

            SyncClient.syncAll();

            navigateTo('home');
          }}
        />
      )}
    </MamoutTheme>
  );
};

export default App;
