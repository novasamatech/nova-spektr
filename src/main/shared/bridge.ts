import { contextBridge, ipcRenderer } from 'electron';

import { checkAutoUpdateSupported } from '@/src/shared/lib/utils';

declare global {
  interface Window {
    App: typeof API;
  }
}

const API = {
  username: process.env.USER,
  isAutoUpdateSupported: checkAutoUpdateSupported(),
  getStoreValue: (key: string): Promise<any> => ipcRenderer.invoke('getStoreValue', key),
  setStoreValue: (key: string, value: any): Promise<void> => ipcRenderer.invoke('setStoreValue', key, value),
};

contextBridge.exposeInMainWorld('App', API);
