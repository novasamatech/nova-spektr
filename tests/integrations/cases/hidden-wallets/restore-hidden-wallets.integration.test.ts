import { allSettled } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { type Wallet, WalletType } from '@/shared/core';
import { accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { hiddenWalletsModel } from '@/features/hidden-wallets/model/hidden-wallets';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../../utils/index';

const makeHiddenWallet = (id: number): Wallet =>
  ({
    id,
    name: `Hidden wallet ${id}`,
    type: WalletType.MULTISIG,
    hiddenReason: 'manual',
  }) as unknown as Wallet;

describe('Hidden wallets — restore from settings', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  it('restores a single wallet selected in the modal', async () => {
    const wallet = makeHiddenWallet(1);

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(walletModel.__test.$rawWallets, [wallet])
      .withStoreValue(accounts.__test.$list, [])
      .build();

    await allSettled(hiddenWalletsModel.toggleWalletSelection, { scope: env.scope, params: wallet });
    expect(env.getState(hiddenWalletsModel.$selectedWallets)).toEqual(new Set([1]));

    await allSettled(hiddenWalletsModel.restoreWallets, { scope: env.scope });

    expect(env.getState(walletModel.$hiddenWallets)).toHaveLength(0);
    expect(env.getState(walletModel.$wallets)).toHaveLength(1);
    expect(env.getState(hiddenWalletsModel.$selectedWallets).size).toBe(0);
  });

  it('restores a group of wallets and leaves unselected ones hidden', async () => {
    const wallets = [makeHiddenWallet(1), makeHiddenWallet(2), makeHiddenWallet(3)];

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(walletModel.__test.$rawWallets, wallets)
      .withStoreValue(accounts.__test.$list, [])
      .build();

    await allSettled(hiddenWalletsModel.toggleGroupSelection, {
      scope: env.scope,
      params: [wallets[0]!, wallets[1]!],
    });
    expect(env.getState(hiddenWalletsModel.$selectedWallets)).toEqual(new Set([1, 2]));

    await allSettled(hiddenWalletsModel.restoreWallets, { scope: env.scope });

    expect(env.getState(walletModel.$wallets).map((w) => w.id)).toEqual([1, 2]);
    expect(env.getState(walletModel.$hiddenWallets).map((w) => w.id)).toEqual([3]);
  });
});
