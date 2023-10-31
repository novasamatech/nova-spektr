import { contextBridge } from 'electron';

declare global {
  interface Window {
    App: typeof API;
  }
}

const API = {
  username: process.env.USER,
};

contextBridge.exposeInMainWorld('App', API);
