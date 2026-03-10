import { type ReactNode } from 'react';

import { SigningType } from '@/shared/core';
import { type MessageSigningProps } from '../lib/types';

import { ExtensionMessageSign } from './ExtensionMessageSign';
import { VaultMessageSign } from './VaultMessageSign';

const SigningFlow: Partial<Record<SigningType, (props: MessageSigningProps) => ReactNode | null>> = {
  [SigningType.POLKADOT_VAULT]: (props) => <VaultMessageSign {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultMessageSign {...props} />,
  [SigningType.MULTISIG]: (props) => <VaultMessageSign {...props} />,
  [SigningType.EXTENSION]: (props) => <ExtensionMessageSign {...props} />,
};

export const MessageSigningSwitch = (props: MessageSigningProps) => {
  const signingType = props.payload.signatory.signingType;
  const render = SigningFlow[signingType];

  if (!render) return null;

  return render(props);
};
