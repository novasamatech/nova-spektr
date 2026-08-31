// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAppendSwitch = vi.fn();

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: mockAppendSwitch,
    },
  },
}));

async function setupWithMode(mode: string): Promise<void> {
  vi.stubEnv('MODE', mode);
  const { setupCertificateErrors } = await import('./certificates');
  setupCertificateErrors();
}

describe('certificates.ts — ignore-certificate-errors switch', () => {
  beforeEach(() => {
    vi.resetModules();
    mockAppendSwitch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should append the switch in development builds only', async () => {
    await setupWithMode('development');

    expect(mockAppendSwitch).toHaveBeenCalledTimes(1);
    expect(mockAppendSwitch).toHaveBeenCalledWith('ignore-certificate-errors');
  });

  it.each(['staging', 'production', 'test'])('should not touch the command line in %s builds', async (mode) => {
    await setupWithMode(mode);

    expect(mockAppendSwitch).not.toHaveBeenCalled();
  });
});
