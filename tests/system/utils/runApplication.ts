import { ElectronApplication, _electron } from 'playwright';

export async function runApplication(): Promise<ElectronApplication> {
  const electronApp: ElectronApplication = await _electron.launch({ 
    executablePath: 'release/dist/mac/Nova Spektr.app/Contents/MacOS/Nova Spektr', // replace with your path
    // args: ['--no-sandbox', '--disable-dev-shm-usage', '--headless'], // run electron in silent mode (without UI)
  });

  return electronApp;
}
