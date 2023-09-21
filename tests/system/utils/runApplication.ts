import { spawn } from 'child_process';
import { existsSync } from 'fs';
import fs from 'fs'

export function runApplication(): void {
  const lockFilePath = './lockfile';
  if (existsSync(lockFilePath)) {
    console.log('Application is already running.');
    return;
  } else {
    fs.writeFileSync(lockFilePath, '');
  }

  const application = spawn('pnpm', ['start:renderer'], { shell: true });

  application.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  application.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  application.on('error', (error) => {
    console.error(`error: ${error.message}`);
  });

  application.on('exit', () => {
    fs.unlinkSync(lockFilePath);
  });
}
