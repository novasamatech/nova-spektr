import { type ReactNode } from 'react';

import { SigningType } from '@/shared/core';
import { type SigningProps } from '../lib/types';

import { Extension } from './Extension';
import { PolkadotVault } from './PolkadotVault';
import { WalletConnect } from './WalletConnect';
import { WatchOnly } from './WatchOnly';

const SigningFlow: Record<SigningType, (props: SigningProps) => ReactNode | null> = {
  [SigningType.MULTISIG]: (props) => <PolkadotVault {...props} />,
  [SigningType.POLKADOT_VAULT]: (props) => <PolkadotVault {...props} />,
  [SigningType.EXTENSION]: (props) => <Extension {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <PolkadotVault {...props} />,
  [SigningType.WALLET_CONNECT]: (props) => <WalletConnect {...props} />,
  [SigningType.WATCH_ONLY]: (props) => <WatchOnly {...props} />,
};

export const SigningSwitch = (props: SigningProps) => {
  const firstPayload = props.signingPayloads.at(0);
  // TODO show empty payload error
  if (!firstPayload) return null;

  const signingType = firstPayload.signatory.signingType;

  return SigningFlow[signingType](props);
};
