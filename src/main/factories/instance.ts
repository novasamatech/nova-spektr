import { app } from 'electron';

export function makeAppWithSingleInstanceLock(fn: () => void) {
  app.requestSingleInstanceLock() ? fn() : app.quit();
}
