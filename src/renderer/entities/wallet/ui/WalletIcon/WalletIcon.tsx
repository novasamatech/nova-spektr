import { WalletType } from '@/shared/core';
import { Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';

const WalletIconNames: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vaultBackground',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vaultBackground',
  [WalletType.WATCH_ONLY]: 'watchOnlyBackground',
  [WalletType.MULTISIG]: 'multisigBackground',
  [WalletType.FLEXIBLE_MULTISIG]: 'flexibleMultisigBackground',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vaultBackground',
  [WalletType.WALLET_CONNECT]: 'walletConnectBackground',
  [WalletType.NOVA_WALLET]: 'novaWalletBackground',
  [WalletType.PROXIED]: 'proxiedBackground',
};

type Props = {
  type: WalletType;
  className?: string;
  size?: number;
};

export const WalletIcon = ({ type, size = 20, className }: Props) => {
  return <Icon name={WalletIconNames[type]} size={size} className={className} />;
};
