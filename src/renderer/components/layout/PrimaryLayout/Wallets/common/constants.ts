import { WalletType } from '@renderer/domain/shared-kernel';
import { IconNames } from '@renderer/shared/ui/types';

export const GroupLabels: Record<WalletType, string> = {
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

export const GroupIcons: Record<WalletType, IconNames> = {
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'multishard',
  [WalletType.WATCH_ONLY]: 'watchonly',
  [WalletType.SINGLE_PARITY_SIGNER]: 'polkadotvault',
};
