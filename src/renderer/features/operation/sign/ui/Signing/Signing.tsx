import { useUnit } from 'effector-react';

import { SigningType } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { SigningProps, InnerSigningProps } from '../../model/types';
import { VaultSigning } from '../VaultSigning/VaultSigning';
import { WalletConnect } from '../WalletConnect/WalletConnect';

export const SigningFlow: Record<SigningType, (props: InnerSigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <VaultSigning {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <VaultSigning {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultSigning {...props} />,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
};

export const Signing = (props: SigningProps) => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = wallets.find((w) => w.id === props.signatory?.walletId);
  const wallet = signatoryWallet || activeWallet;

  if (!wallet) return null;

  return SigningFlow[wallet.signingType]({ ...props, wallet });
};
