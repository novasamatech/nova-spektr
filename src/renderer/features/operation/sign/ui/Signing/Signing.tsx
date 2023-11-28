import { useUnit } from 'effector-react';

import { SigningProps } from '../../model';
import { VaultSigning } from '../VaultSigning/VaultSigning';
import { WalletConnect } from '../WalletConnect/WalletConnect';
import { SigningType } from '@shared/core';
import { walletModel } from '@entities/wallet';

export const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <VaultSigning {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <VaultSigning {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultSigning {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <VaultSigning {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
};

export const Signing = (props: SigningProps) => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = wallets.find((w) => w.id === props.signatory?.walletId);
  const wallet = signatoryWallet || activeWallet;

  if (!wallet) return null;

  return SigningFlow[wallet.signingType](props);
};
