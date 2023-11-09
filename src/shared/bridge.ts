import { contextBridge, ipcRenderer } from 'electron';

declare global {
  interface Window {
    App: typeof API;
  }
}

const API = {
  username: process.env.USER,
  getStoreValue: (key: string): Promise<any> => ipcRenderer.invoke('getStoreValue', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('setStoreValue', key, value),
};

contextBridge.exposeInMainWorld('App', API);
