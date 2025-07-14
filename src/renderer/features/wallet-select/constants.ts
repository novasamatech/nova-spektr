import { type WalletFamily, WalletType } from '@/shared/core';

export const GROUP_LABELS: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.POLKADOT_EXTENSION]: 'wallets.polkadotExtensionLabel',
  [WalletType.TALISMAN_EXTENSION]: 'wallets.talismanExtensionLabel',
  [WalletType.SUBWALLET_EXTENSION]: 'wallets.subWalletExtensionLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.FLEXIBLE_MULTISIG]: 'wallets.flexibleMultisigLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PROXIED]: 'wallets.proxiedLabel',
};
