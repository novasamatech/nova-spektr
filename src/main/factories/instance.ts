import { app } from 'electron';

export function runAppSingleInstance(fn: () => void) {
  app.requestSingleInstanceLock() ? fn() : app.quit();
}
