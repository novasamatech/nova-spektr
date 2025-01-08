import { readdirSync, renameSync, rmSync } from 'fs';
import { join, parse } from 'path';

import { type LogFile } from 'electron-log';
import { default as log } from 'electron-log/main';

const MAX_LOG_FILES_TO_KEEP = 10;

export function setupLogger() {
  log.initialize({ preload: true });
  log.variables.version = process.env.VERSION;
  log.variables.env = import.meta.env.MODE;
  log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
  log.transports.console.useStyles = true;

  log.transports.file.fileName = 'nova-spektr.log';
  log.transports.file.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
  log.transports.file.level = 'info';
  log.transports.file.maxSize = 1048576 * 5; // 5 MB;
  log.transports.file.archiveLogFn = rotateLogs;

  Object.assign(console, log.functions);
  log.errorHandler.startCatching({
    showDialog: false,
    onError({ error }) {
      console.error('Uncaught error', error);
    },
  });
}

function rotateLogs(oldLogFile: LogFile) {
  const file = oldLogFile.toString();
  const info = parse(file);
  const files = readdirSync(info.dir);

  if (files.length > MAX_LOG_FILES_TO_KEEP) {
    const filesToDelete = files.sort().slice(0, files.length - MAX_LOG_FILES_TO_KEEP);
    for (const fileToDelete of filesToDelete) {
      rmSync(join(info.dir, fileToDelete));
    }
  }
  try {
    const date = new Date().toISOString();
    const newFileName = join(info.dir, info.name + '.' + date + info.ext);
    renameSync(file, newFileName);
  } catch (error) {
    console.warn('Could not rotate log', error);
  }
}
