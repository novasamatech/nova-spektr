import { WalletType } from '@renderer/domain/shared-kernel';
import { IconNames } from '@renderer/shared/ui/Icon/data';

export const GroupLabels: Record<WalletType, string> = {
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
};

export const GroupIcons: Record<WalletType, IconNames> = {
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'multishard',
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
};
