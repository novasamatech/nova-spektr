import { app } from 'electron';

import { setupLogger } from './factories/logs';
import { createWindow } from './factories/window';
import { setupApplication } from './factories/setup';
import { setupAutoUpdater } from './factories/updater';
import { runAppSingleInstance } from './factories/instance';
import { PLATFORM } from './shared/constants/platform';
import { ENVIRONMENT } from './shared/constants/environment';

runAppSingleInstance(async () => {
  if (ENVIRONMENT.IS_DEV || ENVIRONMENT.IS_STAGE) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS;

  setupLogger();
  setupAutoUpdater();

  await app.whenReady();
  await setupApplication(createWindow());

  PLATFORM.IS_LINUX && app.disableHardwareAcceleration();
});
