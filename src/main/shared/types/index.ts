import { BrowserWindow, IpcMainInvokeEvent } from 'electron';

export type BrowserWindowOrNull = BrowserWindow | null;

export interface WindowCreationByIPC {
  channel: string;
  window(): BrowserWindowOrNull;
  callback(window: BrowserWindow, event: IpcMainInvokeEvent): void;
}
