import { app } from 'electron';

import { MainWindow } from './main';
import { makeAppWithSingleInstanceLock } from './factories/instance';
import { makeAppSetup } from './factories/setup';

makeAppWithSingleInstanceLock(async () => {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  await app.whenReady();
  await makeAppSetup(MainWindow);
});
