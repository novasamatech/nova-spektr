import { IconNames } from '@renderer/shared/ui/Icon/data';
import { WalletType } from '@renderer/shared/core';

export const GroupLabels: Record<WalletType, string> = {
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

export const GroupIcons: Record<WalletType, IconNames> = {
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'multishard',
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};
