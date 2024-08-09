import { app } from 'electron';

export function runAppSingleInstance(fn: () => void) {
  if (app.requestSingleInstanceLock()) {
    fn();
  } else {
    app.quit();
  }
}
