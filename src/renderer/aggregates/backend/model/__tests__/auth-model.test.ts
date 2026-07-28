import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId, type VaultBaseAccount, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
import { DEFAULT_AUTH_CHAIN_ID } from '../../lib/auth-chain';
import { authModel } from '../auth-model';
import { backendConfigurationModel } from '../backend-configuration-model';

const KUSAMA: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

describe('authModel — chain selector', () => {
  it('defaults $selectedChainId to Polkadot relay chain', () => {
    const scope = fork();
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('chainSelected updates $selectedChainId', async () => {
    const scope = fork();
    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('resets $selectedChainId to default on modalClosed', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);

    await allSettled(authModel.events.modalClosed, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('resets $selectedChainId to default on urlCleared', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    await allSettled(backendConfigurationModel.events.urlCleared, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('forwards chain changes to messageSignModel.chainIdChanged while in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'signing']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(KUSAMA);
  });

  it('does not forward chain changes when not in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'selectAccount']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('authModel — persisted default chain', () => {
  it('resets $selectedChainId to the persisted default instead of Polkadot relay', async () => {
    const scope = fork({ values: [[authModel.__test.$defaultAuthChainId, KUSAMA]] });

    await allSettled(authModel.events.modalClosed, { scope });

    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('saves the chain used for a successful sign-in as the new default', async () => {
    const scope = fork({
      values: [[authModel.$selectedChainId, KUSAMA]],
      handlers: [[authModel.__test.verifySignatureFx, () => ({ permissions: [] })]],
    });

    // sessionHealthCheck (5 min interval) starts on verifySignatureFx.done and keeps the
    // scope busy, so allSettled never resolves — poll the store instead of awaiting it.
    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: 'https://backend.test', accountId: '0x00', challengeId: 'challenge', signature: '0x01' },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.__test.$defaultAuthChainId)).toBe(KUSAMA);
    });
    // The post-connect reset preselects the freshly saved default for the next session.
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('falls back to Polkadot relay when the saved chain is missing from the chains config', async () => {
    const scope = fork({
      values: [
        [authModel.__test.$defaultAuthChainId, KUSAMA],
        [networkModel.$chains, { [polkadotChain.chainId]: polkadotChain }],
      ],
    });

    await allSettled(authModel.events.modalClosed, { scope });

    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('keeps the default chain after sign-out', async () => {
    const scope = fork({
      values: [[authModel.__test.$defaultAuthChainId, KUSAMA]],
      handlers: [[authModel.__test.logoutFx, () => undefined]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(authModel.__test.$defaultAuthChainId)).toBe(KUSAMA);
  });
});

describe('authModel — persisted default account', () => {
  const vaultWallet = { id: 1, type: WalletType.SINGLE_PARITY_SIGNER, name: 'Vault' };

  const createVaultAccount = (id: string, accountId: AccountId): VaultBaseAccount => ({
    id,
    type: 'universal',
    accountType: AccountType.BASE,
    name: `Account ${id}`,
    walletId: 1,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  });

  it('preselects the persisted default account on modal open', async () => {
    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0]), createVaultAccount('2', TEST_ACCOUNTS[1])]],
        [authModel.__test.$defaultAuthAccountId, TEST_ACCOUNTS[1]],
      ],
    });

    await allSettled(backendConfigurationModel.events.modalOpened, { scope });

    expect(scope.getState(authModel.$selectedAccountId)).toBe(TEST_ACCOUNTS[1]);
  });

  it('falls back to the first account when the saved account is gone', async () => {
    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [vaultWallet]],
        [accounts.__test.$list, [createVaultAccount('1', TEST_ACCOUNTS[0]), createVaultAccount('2', TEST_ACCOUNTS[1])]],
        [authModel.__test.$defaultAuthAccountId, TEST_ACCOUNTS[2]],
      ],
    });

    await allSettled(backendConfigurationModel.events.modalOpened, { scope });

    expect(scope.getState(authModel.$selectedAccountId)).toBe(TEST_ACCOUNTS[0]);
  });

  it('saves the account used for a successful sign-in as the new default', async () => {
    const scope = fork({
      values: [[authModel.$selectedAccountId, TEST_ACCOUNTS[1]]],
      handlers: [[authModel.__test.verifySignatureFx, () => ({ permissions: [] })]],
    });

    // sessionHealthCheck (5 min interval) starts on verifySignatureFx.done and keeps the
    // scope busy, so allSettled never resolves — poll the store instead of awaiting it.
    void allSettled(authModel.__test.verifySignatureFx, {
      scope,
      params: { baseUrl: 'https://backend.test', accountId: '0x00', challengeId: 'challenge', signature: '0x01' },
    });

    await vi.waitFor(() => {
      expect(scope.getState(authModel.__test.$defaultAuthAccountId)).toBe(TEST_ACCOUNTS[1]);
    });
  });

  it('keeps the default account after sign-out', async () => {
    const scope = fork({
      values: [
        [authModel.__test.$defaultAuthAccountId, TEST_ACCOUNTS[0]],
        [backendConfigurationModel.$backendUrl, 'https://backend.test'],
      ],
      handlers: [[authModel.__test.logoutFx, () => undefined]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(authModel.__test.$defaultAuthAccountId)).toBe(TEST_ACCOUNTS[0]);
  });
});
