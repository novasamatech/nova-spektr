import { useUnit } from 'effector-react';

import { SigningProps } from '../../model';
import { VaultSigning } from '../VaultSigning/VaultSigning';
import { WalletConnect } from '../WalletConnect/WalletConnect';
import { SigningType } from '@renderer/shared/core';
import { walletModel } from '@renderer/entities/wallet';

export const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <VaultSigning {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultSigning {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
};

export const Signing = (props: SigningProps) => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet) return null;

  return SigningFlow[activeWallet.signingType](props);
};
