import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { AccountType, CryptoType, ProxyVariant, SigningType, type Wallet, WalletType } from '@/shared/core';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountNode, type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { forgetWalletModel } from '../forget-wallet-model';

vi.mock('@/entities/multisig', () => ({
  useForgetMultisig: () => ({ deleteMultisigTxs: jest.fn() }),
}));

vi.mock('@/entities/balance', async () => ({
  ...(await vi.importActual('@/entities/balance')),
  useBalanceService: () => ({ deleteBalance: jest.fn() }),
}));

vi.mock('@walletconnect/sign-client', () => ({
  Client: {},
}));

vi.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
}));

const wallet: Wallet = {
  id: 1,
  name: 'My wallet',
  isActive: false,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
  accounts: [
    {
      id: '1',
      walletId: 1,
      type: 'chain',
      chainId: polkadotChainId,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      name: 'first account',
      accountId: '0x03' as AccountId,
    } as AnyAccount,
    {
      id: '2',
      walletId: 1,
      type: 'chain',
      chainId: polkadotChainId,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      name: 'second account',
      accountId: '0x02' as AccountId,
    },
  ],
};

const proxiedWallet = {
  id: 2,
  name: 'My second wallet',
  isActive: true,
  type: WalletType.PROXIED,
  signingType: SigningType.WATCH_ONLY,
  accounts: [
    {
      id: 3,
      type: 'chain',
      accountId: '0x01',
      proxiedAccountId: '0x01',
      proxyAccountId: '0x02',
      chainId: polkadotChainId,
      delay: 0,
      proxyType: 'Any',
      proxyVariant: ProxyVariant.PURE,
      walletId: 2,
      name: 'proxied',
      accountType: AccountType.PROXIED,
      chainType: 0,
      cryptoType: 0,
    } as unknown as AnyAccount,
  ],
};

const mockChains = {
  [polkadotChainId]: polkadotChain,
};

describe('features/wallets/ForgetModel', () => {
  test('should delete wallet and accounts', async () => {
    const spyDeleteWallet = jest.fn();
    const spyDeleteAccounts = jest.fn().mockImplementation((accounts: AnyAccount[]) => accounts);

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [wallet]],
        [accounts.__test.$list, wallet.accounts],
      ],
      handlers: [
        [accounts.deleteAccounts, spyDeleteAccounts],
        [walletModel.__test.removeWalletsFx, spyDeleteWallet],
        [balanceModel.__test.removeBalancesFx, () => {}],
      ],
    });

    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyDeleteWallet).toHaveBeenCalledWith([wallet]);
  });

  test('should delete proxied accounts, wallets and proxyGroups', async () => {
    jest.spyOn(accountService, 'createAccountGraphs').mockImplementation(() => {
      return new Map<AnyAccount, AccountNode>([
        [wallet.accounts[1], { account: wallet.accounts[1], children: [] }],
        [
          proxiedWallet.accounts[0],
          { account: proxiedWallet.accounts[0], children: [{ account: wallet.accounts[1], children: [] }] },
        ],
      ]);
    });

    const spyProxies = vi.fn();

    const scope = fork({
      values: new Map()
        .set(walletModel.__test.$rawWallets, [wallet, proxiedWallet])
        .set(accounts.__test.$list, [...wallet.accounts, ...proxiedWallet.accounts])
        .set(networkModel.$chains, mockChains),
      handlers: [[proxiesModel.findAllProxies, spyProxies]],
    });

    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(scope.getState(walletModel.__test.$rawWallets)).toEqual([]);
    expect(scope.getState(proxyModel.$proxyGroups)).toEqual([]);
    expect(scope.getState(proxyModel.$proxies)).toEqual({});
  });
});
