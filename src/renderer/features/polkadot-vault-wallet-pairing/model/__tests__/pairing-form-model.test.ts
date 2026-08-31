import { allSettled, fork } from 'effector';

import { type Wallet, WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { pairingFormModel } from '../pairing-form-model';

const ROOT = '0x01' as AccountId;

const singleshardParams = {
  wallet: { name: 'Signer', rootAccountId: ROOT, type: WalletType.SINGLE_PARITY_SIGNER },
  accounts: [],
} as unknown as Parameters<typeof pairingFormModel.createSingleshard>[0];

const vaultWallet = {
  id: 7,
  name: 'My Vault',
  type: WalletType.POLKADOT_VAULT,
  rootAccountId: ROOT,
  isActive: false,
} as unknown as Omit<Wallet, 'accounts'>;

describe('features/polkadot-vault-wallet-pairing/model/pairing-form-model', () => {
  test('blocks pairing when the scanned key already belongs to a vault wallet', async () => {
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: ROOT });

    expect(scope.getState(pairingFormModel.$existingWallet)?.id).toBe(7);
  });

  test('does not block when the scanned key is new', async () => {
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: '0x02' as AccountId });

    expect(scope.getState(pairingFormModel.$existingWallet)).toBeNull();
  });

  test('opening the existing wallet selects it and closes the flow', async () => {
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
    });

    await allSettled(pairingFormModel.flow.open, { scope, params: {} });
    await allSettled(pairingFormModel.seedScanned, { scope, params: ROOT });
    await allSettled(pairingFormModel.openExistingWallet, { scope });

    expect(scope.getState(walletSelect.__test.$selectedWalletId)).toBe(7);
    expect(scope.getState(pairingFormModel.flow.status)).toBe(false);
    expect(scope.getState(pairingFormModel.$existingWallet)).toBeNull();
  });

  test('does not create a singleshard when the scanned key belongs to an existing vault', async () => {
    const createWallet = vi.fn();
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
      handlers: new Map<any, any>([[walletModel.createWallet, createWallet]]),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: ROOT });
    await allSettled(pairingFormModel.createSingleshard, { scope, params: singleshardParams });

    expect(createWallet).not.toHaveBeenCalled();
  });

  test('creates a singleshard when the scanned key is new', async () => {
    const createWallet = vi.fn().mockResolvedValue(undefined);
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [vaultWallet]).set(accounts.__test.$list, []),
      handlers: new Map<any, any>([[walletModel.createWallet, createWallet]]),
    });

    await allSettled(pairingFormModel.seedScanned, { scope, params: '0x02' as AccountId });
    await allSettled(pairingFormModel.createSingleshard, { scope, params: singleshardParams });

    expect(createWallet).toHaveBeenCalledWith(singleshardParams);
  });
});
