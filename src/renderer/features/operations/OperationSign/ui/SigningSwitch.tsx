import { SigningType } from '@/shared/core';
import { type SigningProps } from '../lib/types';

import { Vault } from './Vault';
import { WalletConnect } from './WalletConnect';

const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <Vault {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <Vault {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <Vault {...props} />,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
};

export const SigningSwitch = (props: SigningProps) => {
  const firstPayload = props.signingPayloads.at(0);
  // TODO show empty payload error
  if (!firstPayload) return null;

  const signingType = firstPayload.signatory?.signingType ?? firstPayload.account?.signingType;

  return SigningFlow[signingType](props);
};
