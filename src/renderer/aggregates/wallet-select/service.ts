import { type Chain, type Wallet, type WalletFamily, WalletType } from '@/shared/core';
import { includes, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

const getWalletByGroups = (wallets: Wallet[], query = ''): Record<WalletFamily, Wallet[]> => {
  const accumulator: Record<WalletFamily, Wallet[]> = {
    [WalletType.POLKADOT_VAULT]: [],
    [WalletType.MULTISIG]: [],
    [WalletType.FLEXIBLE_MULTISIG]: [],
    [WalletType.NOVA_WALLET]: [],
    [WalletType.WALLET_CONNECT]: [],
    [WalletType.POLKADOT_EXTENSION]: [],
    [WalletType.TALISMAN_EXTENSION]: [],
    [WalletType.SUBWALLET_EXTENSION]: [],
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
    if (walletUtils.isPolkadotExtension(wallet)) groupIndex = WalletType.POLKADOT_EXTENSION;
    if (walletUtils.isTalismanExtension(wallet)) groupIndex = WalletType.TALISMAN_EXTENSION;
    if (walletUtils.isSubWalletExtension(wallet)) groupIndex = WalletType.SUBWALLET_EXTENSION;

    if (groupIndex && includes(wallet.name, query)) {
      acc[groupIndex].push(wallet);
    }

    return acc;
  }, accumulator);
};

const composeWalletMeta = (wallet: Wallet, accounts: AnyAccount[], chains: Record<string, Chain>) => {
  const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);

  return walletAccounts
    .map(account => {
      if (accountService.isUniversalAccount(account)) {
        return Object.values(chains)
          .filter(chain => accountService.isAccountAvailableOnChain(account, chain))
          .map(chain => toAddress(account.accountId, { prefix: chain.addressPrefix }))
          .join(' ');
      }

      const chain = chains[account.chainId];
      return toAddress(account.accountId, { prefix: chain.addressPrefix });
    })
    .join(' ');
};

export const walletSelectService = {
  getWalletByGroups,
  composeWalletMeta,
};
