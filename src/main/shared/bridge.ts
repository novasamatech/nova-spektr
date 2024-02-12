import { contextBridge, ipcRenderer } from 'electron';

import { checkAutoUpdateSupported } from './lib/utils';
import { AUTO_UPDATE_ENABLED } from './constants';

declare global {
  interface Window {
    App: typeof API;
  }
}

const API = {
  username: process.env.USER,
  isAutoUpdateSupported: checkAutoUpdateSupported(),
  getIsAutoUpdateEnabled: (): Promise<any> => {
    return ipcRenderer.invoke('getStoreValue', AUTO_UPDATE_ENABLED);
  },
  setIsAutoUpdateEnabled: (value: any): Promise<void> => {
    return ipcRenderer.invoke('setStoreValue', AUTO_UPDATE_ENABLED, value);
  },
  getStoreValue: (key: string): Promise<any> => {
    return ipcRenderer.invoke('getStoreValue', key);
  },
  setStoreValue: (key: string, value: any): Promise<void> => {
    return ipcRenderer.invoke('setStoreValue', key, value);
  },
  onProtocolOpen: (callback: (value: string) => void) => {
    return ipcRenderer.on('protocol-open', (_, value) => callback(value));
  },
};

contextBridge.exposeInMainWorld('App', API);
