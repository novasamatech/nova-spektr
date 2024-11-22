import { type Wallet, type WalletFamily, WalletType } from '@/shared/core';
import { includes } from '@/shared/lib/utils';
import { walletUtils } from '@/entities/wallet';

const getWalletByGroups = (wallets: Wallet[], query = ''): Record<WalletFamily, Wallet[]> => {
  const accumulator: Record<WalletFamily, Wallet[]> = {
    [WalletType.POLKADOT_VAULT]: [],
    [WalletType.MULTISIG]: [],
    [WalletType.FLEXIBLE_MULTISIG]: [],
    [WalletType.NOVA_WALLET]: [],
    [WalletType.WALLET_CONNECT]: [],
    [WalletType.WATCH_ONLY]: [],
    [WalletType.PROXIED]: [],
  };

  return wallets.reduce<Record<WalletFamily, Wallet[]>>((acc, wallet) => {
    let groupIndex: WalletFamily | undefined;

    if (walletUtils.isPolkadotVaultGroup(wallet)) groupIndex = WalletType.POLKADOT_VAULT;
    if (walletUtils.isRegularMultisig(wallet)) groupIndex = WalletType.MULTISIG;
    if (walletUtils.isFlexibleMultisig(wallet)) groupIndex = WalletType.FLEXIBLE_MULTISIG;
    if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
    if (walletUtils.isWalletConnect(wallet)) groupIndex = WalletType.WALLET_CONNECT;
    if (walletUtils.isNovaWallet(wallet)) groupIndex = WalletType.NOVA_WALLET;
    if (walletUtils.isProxied(wallet)) groupIndex = WalletType.PROXIED;

    if (groupIndex && includes(wallet.name, query)) {
      acc[groupIndex].push(wallet);
    }

    return acc;
  }, accumulator);
};

const getFirstWallet = (wallets: Wallet[]): Wallet | null => {
  return Object.values(getWalletByGroups(wallets)).flat().at(0) ?? null;
};

export const walletSelectService = {
  getWalletByGroups,
  getFirstWallet,
};
