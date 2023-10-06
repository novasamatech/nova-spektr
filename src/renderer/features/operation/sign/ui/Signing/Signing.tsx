import { SigningProps } from '../../model';
import { VaultSigning } from '../VaultSigning/VaultSigning';
import { SigningType } from '@renderer/shared/core';

export const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <VaultSigning {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultSigning {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
};

export const Signing = (props: SigningProps) => {
  if (!props.wallet) return null;

  return SigningFlow[props.wallet.signingType](props);
};
