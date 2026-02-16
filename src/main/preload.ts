import { contextBridge, ipcRenderer } from 'electron';

import { IPC } from './shared/constants/ipc';
import { AUTO_UPDATE_ENABLED } from './shared/constants/store';
import { checkAutoUpdateSupported } from './shared/lib/utils';

declare global {
  interface Window {
    App: typeof API;
  }
}

const API = {
  username: process.env.USER,
  isAutoUpdateSupported: checkAutoUpdateSupported(),
  getIsAutoUpdateEnabled: () => {
    return ipcRenderer.invoke('getStoreValue', AUTO_UPDATE_ENABLED);
  },
  setIsAutoUpdateEnabled: (value: unknown) => {
    return ipcRenderer.invoke('setStoreValue', AUTO_UPDATE_ENABLED, value);
  },
  getStoreValue: (key: string) => {
    return ipcRenderer.invoke('getStoreValue', key);
  },
  setStoreValue: (key: string, value: unknown) => {
    return ipcRenderer.invoke('setStoreValue', key, value);
  },
  onProtocolOpen: (callback: (value: string) => void) => {
    return ipcRenderer.on('protocol-open', (_, value) => callback(value));
  },
  proxyFetch: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    return ipcRenderer.invoke(IPC.PROXY.FETCH, url, init);
  },
};

contextBridge.exposeInMainWorld('App', API);
