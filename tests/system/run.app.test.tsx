import { ElectronApplication } from 'playwright';
import { runApplication } from './utils/runApplication';

jest.setTimeout(60000); // Set default timeout to one minute

describe('Electron application', () => {
  let electronApp: ElectronApplication;
  let window: any;

  beforeEach(async () => {
    electronApp = await runApplication();
    window = await electronApp.firstWindow();
  });

  afterEach(async () => {
    await electronApp.close();
  });

  it('should open the application', async () => {
    expect(await window.title()).toBe('Nova Spektr');
  });

  it('should display the correct content', async () => {
    const content = await window.textContent('css-selector');
    expect(content).toBe('Expected Content');
  });
});
