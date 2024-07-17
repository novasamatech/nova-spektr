import { walletSelectUtils } from '../wallet-select-utils';
import { type Wallet, WalletType } from '@shared/core';

describe('features/wallets/WalletSelect/lib/wallet-select-utils', () => {
  const wallets = [
    { id: 1, type: WalletType.POLKADOT_VAULT, name: 'pv' },
    { id: 2, type: WalletType.WALLET_CONNECT, name: 'wc' },
    { id: 3, type: WalletType.SINGLE_PARITY_SIGNER, name: 'sps' },
  ] as Wallet[];

  test('should group wallets POLKADOT_VAULT > MULTISIG > NOVA_WALLET > WALLET_CONNECT > WATCH_ONLY > PROXIES', () => {
    const groups = walletSelectUtils.getWalletByGroups(wallets);
    const groupedWallets = Object.values(groups).flat();

    expect(groupedWallets).toEqual([wallets[0], wallets[2], wallets[1]]);
  });

  test('should group wallets with respect to query', () => {
    const groups = walletSelectUtils.getWalletByGroups(wallets, 'p');
    const groupedWallets = Object.values(groups).flat();

    expect(groupedWallets).toEqual([wallets[0], wallets[2]]);
  });
});
