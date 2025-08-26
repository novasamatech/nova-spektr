import { t } from 'i18next';

import { type WalletFamily, WalletType } from '@/shared/core';

export const GROUP_LABELS: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: t('wallets.paritySignerLabel'),
  [WalletType.POLKADOT_EXTENSION]: t('wallets.polkadotExtensionLabel'),
  [WalletType.TALISMAN_EXTENSION]: t('wallets.talismanExtensionLabel'),
  [WalletType.SUBWALLET_EXTENSION]: t('wallets.subWalletExtensionLabel'),
  [WalletType.MULTISIG]: t('wallets.multisigLabel'),
  [WalletType.FLEXIBLE_MULTISIG]: t('wallets.flexibleMultisigLabel'),
  [WalletType.WALLET_CONNECT]: t('wallets.walletConnectLabel'),
  [WalletType.NOVA_WALLET]: t('wallets.novaWalletLabel'),
  [WalletType.WATCH_ONLY]: t('wallets.watchOnlyLabel'),
  [WalletType.PROXIED]: t('wallets.proxiedLabel'),
};
