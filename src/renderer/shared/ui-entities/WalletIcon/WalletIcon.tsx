import { memo } from 'react';

import { WalletType } from '@/shared/core';
import { type IconNames, Icon } from '@/shared/ui';

const iconNames: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vaultBackground',
  [WalletType.POLKADOT_EXTENSION]: 'polkadotExtensionBackground',
  [WalletType.TALISMAN_EXTENSION]: 'talismanExtensionBackground',
  [WalletType.SUBWALLET_EXTENSION]: 'subwalletExtensionBackground',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vaultBackground',
  [WalletType.WATCH_ONLY]: 'watchOnlyBackground',
  [WalletType.MULTISIG]: 'multisigBackground',
  [WalletType.FLEXIBLE_MULTISIG]: 'flexibleMultisigBackground',
  [WalletType.WALLET_CONNECT]: 'walletConnectBackground',
  [WalletType.NOVA_WALLET]: 'novaWalletBackground',
  [WalletType.PROXIED]: 'proxiedBackground',
};

type Props = {
  type: WalletType;
  size?: number;
};

export const WalletIcon = memo(({ type, size = 20 }: Props) => {
  return <Icon name={iconNames[type]} size={size} />;
});
