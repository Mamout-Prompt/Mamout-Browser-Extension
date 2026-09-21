import { getAllPromptsSync, syncPrompts } from '../db/repository';
import type { PromptSearchableDb } from '../types/prompt';

export type ConnectionState =
  | { type: 'disconnected' }
  | { type: 'connecting'; url: string }
  | { type: 'connected'; url: string }
  | { type: 'error'; message: string };

/**
 * Wire DTO matching Kotlin's Prompt model.
 */
export interface WirePrompt {
  id?: number;
  title: string;
  description: string;
  lastModified: number;
}

/**
 * Wire DTO matching Kotlin's PromptSearchable model.
 */
export interface WirePromptSearchable {
  prompt: WirePrompt;
  templateText: string;
}

/**
 * Wire payload matching Kotlin's SyncPayload structure.
 */
export interface WireSyncPayload {
  allPrompts?: WirePromptSearchable[] | null;
  singlePrompt?: string | null;
}

type StateChangeListener = (state: ConnectionState) => void;

class SyncClientService {
  private socket: WebSocket | null = null;
  private currentState: ConnectionState = { type: 'disconnected' };
  private listeners: Set<StateChangeListener> = new Set();
  private currentUrl: string = '';

  public getState(): ConnectionState {
    return this.currentState;
  }

  /**
   * Registers a state change listener to notify UI components of connection status updates.
   *
   * @param listener - Callback function triggered whenever connection state changes.
   * @returns Unsubscribe function to remove the listener.
   */
  public subscribeState(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: ConnectionState) {
    this.currentState = newState;
    this.listeners.forEach((listener) => listener(newState));
  }

  /**
   * Establishes a WebSocket connection to the specified host address and port (e.g., "192.168.1.50:8080").
   *
   * @param address - Target server host address and port.
   */
  public connect(address: string) {
    if (!address.trim()) return;

    let formattedUrl = address.trim();
    if (!formattedUrl.startsWith('ws://') && !formattedUrl.startsWith('wss://')) {
      formattedUrl = `ws://${formattedUrl}`;
    }

    this.currentUrl = formattedUrl;
    this.closeSocket();

    this.setState({ type: 'connecting', url: this.currentUrl });

    try {
      this.socket = new WebSocket(this.currentUrl);

      this.socket.onopen = () => {
        console.log('[Mamout Sync] Connected to server:', this.currentUrl);
        this.setState({ type: 'connected', url: this.currentUrl });

        // Synchronize local database contents with the server upon establishing connection
        this.syncAll();
      };

      this.socket.onmessage = async (event) => {
        await this.handleIncomingMessage(event.data);
      };

      this.socket.onerror = (error) => {
        console.error('[Mamout Sync] WebSocket error:', error);
        this.setState({ type: 'error', message: 'Failed to connect to server' });
      };

      this.socket.onclose = () => {
        console.log('[Mamout Sync] Connection closed');
        if (this.currentState.type === 'connected' || this.currentState.type === 'connecting') {
          this.setState({ type: 'disconnected' });
        }
      };
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : 'Invalid URL address format';
      this.setState({ type: 'error', message: errMessage });
    }
  }

  /**
   * Closes the active WebSocket connection and resets internal connection state.
   */
  public disconnect() {
    this.closeSocket();
    this.setState({ type: 'disconnected' });
  }

  private closeSocket() {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Reads local prompts from IndexedDB, maps them to the Kotlin wire format, and transmits them.
   */
  public async syncAll(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const allPrompts = await getAllPromptsSync();

      // Map flat database projections to Kotlin's nested WirePromptSearchable format
      const wirePrompts: WirePromptSearchable[] = allPrompts.map((p) => ({
        prompt: {
          id: p.id,
          title: p.title,
          description: p.description,
          lastModified: p.lastModified,
        },
        templateText: p.templateText,
      }));

      const payload: WireSyncPayload = { allPrompts: wirePrompts };
      this.socket.send(JSON.stringify(payload));
      console.log('[Mamout Sync] Prompts sent to server:', wirePrompts.length);
    } catch (e) {
      console.error('[Mamout Sync] Error sending prompts to server:', e);
    }
  }

  /**
   * Handles incoming JSON payloads from the server and maps them to local IndexedDB entities.
   *
   * @param messageData - Raw text message frame received over WebSocket.
   */
  private async handleIncomingMessage(messageData: string) {
    try {
      const payload: WireSyncPayload = JSON.parse(messageData);

      if (payload.allPrompts && Array.isArray(payload.allPrompts)) {
        console.log('[Mamout Sync] Prompts received from server:', payload.allPrompts.length);

        // Convert Kotlin's nested WirePromptSearchable format back to flat PromptSearchableDb projections
        const localPrompts: PromptSearchableDb[] = payload.allPrompts.map((item) => ({
          id: item.prompt.id ?? 0,
          title: item.prompt.title,
          description: item.prompt.description,
          lastModified: item.prompt.lastModified,
          templateText: item.templateText,
        }));

        await syncPrompts(localPrompts);
      }
    } catch (e) {
      console.error('[Mamout Sync] Error parsing incoming message payload:', e);
    }
  }
}

export const SyncClient = new SyncClientService();
