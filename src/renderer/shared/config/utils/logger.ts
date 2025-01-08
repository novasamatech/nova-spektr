import log from 'electron-log';

import { isElectron } from '@/shared/lib/utils';

export const logger = {
  init,
};

/**
 * Initialize logger for **not WEB** environment
 */
function init() {
  if (process.env.LOGGER === 'false') return;
  if (!isElectron()) return;

  log.variables.version = process.env.VERSION;
  log.variables.env = import.meta.env.MODE;
  log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
  log.transports.console.useStyles = true;

  Object.assign(console, log.functions);
  log.errorHandler.startCatching({
    showDialog: false,
    onError({ error }) {
      console.error('Uncaught error', error);
    },
  });
}
