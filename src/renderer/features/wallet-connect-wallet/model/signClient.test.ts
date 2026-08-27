import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const coreMock = vi.hoisted(() => vi.fn());
const clientInitMock = vi.hoisted(() => vi.fn());
const constantsMock = vi.hoisted(() => ({ WALLET_CONNECT_PROJECT_ID: '' }));

vi.mock('@walletconnect/core', () => ({
  Core: coreMock,
  RELAYER_EVENTS: { connect: 'connect', connection_stalled: 'connection_stalled', disconnect: 'disconnect' },
}));
vi.mock('@walletconnect/sign-client', () => ({ default: { init: clientInitMock } }));
vi.mock('@/shared/lib/utils', async importOriginal => ({
  ...(await importOriginal()),
  get WALLET_CONNECT_PROJECT_ID() {
    return constantsMock.WALLET_CONNECT_PROJECT_ID;
  },
  get IS_WALLET_CONNECT_CONFIGURED() {
    return constantsMock.WALLET_CONNECT_PROJECT_ID !== '';
  },
}));

import { $mutatedFeatures } from '@/shared/config/features';

import { walletConnectWalletFeature } from './feature';
import { signClient } from './signClient';

describe('wallet-connect-wallet/model/signClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coreMock.mockImplementation(function () {
      return { relayer: { on: vi.fn() } };
    });
    clientInitMock.mockResolvedValue({ session: { getAll: () => [] }, pairing: { getAll: () => [] } });
  });

  it('should not initialise WalletConnect when project id is empty', async () => {
    constantsMock.WALLET_CONNECT_PROJECT_ID = '';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scope = fork({ values: [[$mutatedFeatures, { walletConnect: true }]] });

    await allSettled(walletConnectWalletFeature.start, { scope });

    expect(coreMock).not.toHaveBeenCalled();
    expect(clientInitMock).not.toHaveBeenCalled();
    expect(scope.getState(signClient.$client)).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('WALLET_CONNECT_PROJECT_ID'));
  });

  it('should initialise WalletConnect when project id is set', async () => {
    constantsMock.WALLET_CONNECT_PROJECT_ID = 'project-id';
    const scope = fork({ values: [[$mutatedFeatures, { walletConnect: true }]] });

    await allSettled(walletConnectWalletFeature.start, { scope });

    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project-id' }));
    expect(scope.getState(signClient.$client)).not.toBeNull();
  });
});
