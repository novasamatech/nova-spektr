import { allSettled, fork } from 'effector';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { TEST_ADDRESS, toAccountId } from '@/shared/lib/utils';
import { accounts, identity } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { pairingFormModel } from '../form';

const watchOnlyWallet = {
  id: 7,
  name: 'Watched',
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
  isActive: false,
} as unknown as Omit<Wallet, 'accounts'>;

const watchOnlyAccount = {
  id: 1,
  walletId: 7,
  accountId: toAccountId(TEST_ADDRESS),
  type: 'universal',
};

const makeScope = (createWallet = vi.fn()) =>
  fork({
    values: new Map()
      .set(walletModel.__test.$rawWallets, [watchOnlyWallet])
      .set(accounts.__test.$list, [watchOnlyAccount]),
    handlers: new Map<any, any>([
      [walletModel.createWallet, createWallet],
      [identity.request, vi.fn().mockResolvedValue({})],
    ]),
  });

describe('features/watch-only-wallet-pairing/model/form', () => {
  test('finds a watch-only wallet already tracking the typed address', async () => {
    const scope = makeScope();

    await allSettled(pairingFormModel.form.fields.address.onChange, { scope, params: TEST_ADDRESS });

    expect(scope.getState(pairingFormModel.$existingWallet)?.id).toBe(7);
  });

  test('does not match when no watch-only wallet tracks the address', async () => {
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [watchOnlyWallet]).set(accounts.__test.$list, []),
      handlers: new Map<any, any>([[identity.request, vi.fn().mockResolvedValue({})]]),
    });

    await allSettled(pairingFormModel.form.fields.address.onChange, { scope, params: TEST_ADDRESS });

    expect(scope.getState(pairingFormModel.$existingWallet)).toBeNull();
  });

  test('yields null for an invalid address', async () => {
    const scope = makeScope();

    await allSettled(pairingFormModel.form.fields.address.onChange, { scope, params: 'not-an-address' });

    expect(scope.getState(pairingFormModel.$existingWallet)).toBeNull();
  });

  test('does not create a wallet on submit when a duplicate exists', async () => {
    const createWallet = vi.fn();
    const scope = makeScope(createWallet);

    await allSettled(pairingFormModel.form.fields.address.onChange, { scope, params: TEST_ADDRESS });
    await allSettled(pairingFormModel.form.fields.walletName.onChange, { scope, params: 'New' });
    await allSettled(pairingFormModel.form.submit, { scope });

    expect(scope.getState(pairingFormModel.form.$isValid)).toBe(true);
    expect(createWallet).not.toHaveBeenCalled();
  });

  test('opening the existing wallet selects it and closes the flow', async () => {
    const scope = makeScope();

    await allSettled(pairingFormModel.flow.open, { scope, params: {} });
    await allSettled(pairingFormModel.form.fields.address.onChange, { scope, params: TEST_ADDRESS });
    await allSettled(pairingFormModel.openExistingWallet, { scope });

    expect(scope.getState(walletSelect.__test.$selectedWalletId)).toBe(7);
    expect(scope.getState(pairingFormModel.flow.status)).toBe(false);
  });
});
