import { useUnit } from 'effector-react';

import { SigningType } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { SigningProps, InnerSigningProps } from '../lib/types';
import { Vault } from './Vault';
import { WalletConnect } from './WalletConnect';

const SigningFlow: Record<SigningType, (props: InnerSigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <Vault {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <Vault {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <Vault {...props} />,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
};

export const OperationSign = (props: SigningProps) => {
  // TODO: not always __activeWallet__ is a signing wallet, need to rely on __signerWaller__
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = wallets.find((w) => w.id === props.signatory?.walletId);
  const wallet = signatoryWallet || props.signerWaller || activeWallet;

  if (!wallet) return null;

  return SigningFlow[wallet.signingType]({ ...props, wallet });
};
