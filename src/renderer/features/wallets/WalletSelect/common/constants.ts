import { IconNames } from '@renderer/shared/ui/Icon/data';
import { WalletType } from '@renderer/shared/core';

export const GroupLabels: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.paritySignerLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
};

export const GroupIcons: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.WATCH_ONLY]: 'watchOnly',
};
