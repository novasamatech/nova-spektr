import { t } from 'i18next';

import { WalletType } from '@/shared/core';

export const walletTypesTitles: Record<WalletType, string> = {
  [WalletType.POLKADOT_EXTENSION]: t('wallets.polkadotExtensionLabel'),
  [WalletType.WATCH_ONLY]: t('wallets.watchOnlyLabel'),
  [WalletType.POLKADOT_VAULT]: t('wallets.paritySignerLabel'),
  [WalletType.MULTISIG]: t('wallets.multisigLabel'),
  [WalletType.FLEXIBLE_MULTISIG]: t('wallets.flexibleMultisigLabel'),
  [WalletType.WALLET_CONNECT]: t('wallets.walletConnectLabel'),
  [WalletType.NOVA_WALLET]: t('wallets.novaWalletLabel'),
  [WalletType.PROXIED]: t('wallets.proxiedLabel'),
  [WalletType.TALISMAN_EXTENSION]: t('wallets.talismanExtensionLabel'),
  [WalletType.SUBWALLET_EXTENSION]: t('wallets.subWalletExtensionLabel'),
  [WalletType.SINGLE_PARITY_SIGNER]: t('wallets.paritySignerLabel'),
};
