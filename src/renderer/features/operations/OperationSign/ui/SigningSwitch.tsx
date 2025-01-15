import { SigningType } from '@/shared/core';
import { type SigningProps } from '../lib/types';

import { PolkadotExtension } from './PolkadotExtension';
import { PolkadotVault } from './PolkadotVault';
import { WalletConnect } from './WalletConnect';
import { WatchOnly } from './WatchOnly';

const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <PolkadotVault {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <PolkadotVault {...props} />,
  [SigningType.POLKADOT_EXTENSION]: (props) => <PolkadotExtension {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <PolkadotVault {...props} />,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
  [SigningType.WATCH_ONLY]: (props) => <WatchOnly {...props} />,
};

export const SigningSwitch = (props: SigningProps) => {
  const firstPayload = props.signingPayloads.at(0);
  // TODO show empty payload error
  if (!firstPayload) return null;

  const signingType = firstPayload.signatory?.signingType ?? firstPayload.account?.signingType;

  return SigningFlow[signingType](props);
};
