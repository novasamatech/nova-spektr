import { contextBridge, ipcRenderer } from 'electron';

import { IPC } from './shared/constants/ipc';
import { AUTO_UPDATE_ENABLED } from './shared/constants/store';
import { checkAutoUpdateSupported } from './shared/lib/utils';

declare global {
  interface Window {
    App: typeof API;
  }
}

// Whitelist of store keys that the renderer is allowed to read/write.
// Adding arbitrary keys here requires an explicit code review decision.
const ALLOWED_STORE_KEYS = [AUTO_UPDATE_ENABLED] as const;
type AllowedStoreKey = (typeof ALLOWED_STORE_KEYS)[number];

function isAllowedKey(key: string): key is AllowedStoreKey {
  return (ALLOWED_STORE_KEYS as readonly string[]).includes(key);
}

const API = {
  // NOTE: process.env.USER (system username) intentionally NOT exposed to the
  // renderer — doing so leaks OS-level identity to untrusted web content (#20).
  isAutoUpdateSupported: checkAutoUpdateSupported(),
  getIsAutoUpdateEnabled: () => {
    return ipcRenderer.invoke('getStoreValue', AUTO_UPDATE_ENABLED);
  },
  setIsAutoUpdateEnabled: (value: unknown) => {
    return ipcRenderer.invoke('setStoreValue', AUTO_UPDATE_ENABLED, value);
  },
  getStoreValue: (key: string) => {
    if (!isAllowedKey(key)) {
      console.warn(`[Security] Blocked read from unlisted store key: "${key}"`);

      return undefined;
    }

    return ipcRenderer.invoke('getStoreValue', key);
  },
  setStoreValue: (key: string, value: unknown) => {
    if (!isAllowedKey(key)) {
      console.warn(`[Security] Blocked write to unlisted store key: "${key}"`);

      return;
    }

    return ipcRenderer.invoke('setStoreValue', key, value);
  },
  onProtocolOpen: (callback: (value: string) => void) => {
    return ipcRenderer.on('protocol-open', (_, value) => callback(value));
  },
  proxyFetch: (url: string, init?: Pick<RequestInit, 'method' | 'headers' | 'body'>) => {
    return ipcRenderer.invoke(IPC.PROXY.FETCH, url, init);
  },
};

contextBridge.exposeInMainWorld('App', API);
