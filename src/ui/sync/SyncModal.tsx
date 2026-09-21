import React, { useState, useEffect } from 'react';
import { SyncClient, type ConnectionState } from '../../sync/SyncClient';
import './SyncModal.css';

declare const chrome: any;

const SYNC_SERVER_KEY = 'mamout_sync_server_url';

interface SyncModalProps {
  onDismiss: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onDismiss }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [connState, setConnState] = useState<ConnectionState>(SyncClient.getState());

  useEffect(() => {
    const loadSavedUrl = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const res = await chrome.storage.local.get(SYNC_SERVER_KEY);
        if (res[SYNC_SERVER_KEY]) setServerUrl(res[SYNC_SERVER_KEY]);
      } else {
        const saved = localStorage.getItem(SYNC_SERVER_KEY);
        if (saved) setServerUrl(saved);
      }
    };
    loadSavedUrl();

    const unsubscribe = SyncClient.subscribeState((state) => {
      setConnState(state);
    });

    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    if (!serverUrl.trim()) return;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [SYNC_SERVER_KEY]: serverUrl });
    } else {
      localStorage.setItem(SYNC_SERVER_KEY, serverUrl);
    }

    SyncClient.connect(serverUrl);
  };

  const handleDisconnect = () => {
    SyncClient.disconnect();
  };

  return (
    <div className="dialog-overlay" onClick={onDismiss}>
      <div className="dialog-card sync-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Remote Synchronization</h3>
        <p className="dialog-text">
          Enter the server IP address and port host (e.g. <code>192.168.1.50:8080</code>).
        </p>

        <div className="form-group sync-form-group">
          <label className="form-label">Server Host (IP:Port)</label>
          <input
            type="text"
            className="dialog-input"
            placeholder="192.168.1.50:8080"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={connState.type === 'connected' || connState.type === 'connecting'}
          />
        </div>

        <div className="sync-status-indicator">
          {connState.type === 'disconnected' && (
            <span className="status-badge status-off">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="12" cy="12" r="8" />
              </svg>
              Disconnected
            </span>
          )}
          {connState.type === 'connecting' && (
            <span className="status-badge status-working">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="spin-icon">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connecting...
            </span>
          )}
          {connState.type === 'connected' && (
            <span className="status-badge status-on">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Connected to {connState.url}
            </span>
          )}
          {connState.type === 'error' && (
            <span className="status-badge status-error">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {connState.message}
            </span>
          )}
        </div>

        <div className="dialog-actions sync-actions">
          {connState.type === 'connected' ? (
            <>
              <button className="btn btn-text text-error" onClick={handleDisconnect}>
                Disconnect
              </button>
              <button className="btn btn-primary" onClick={onDismiss}>
                Close
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-text" onClick={onDismiss}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={!serverUrl.trim() || connState.type === 'connecting'}
              >
                Connect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
