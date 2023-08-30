import { SigningProps } from '../../model';
import { SigningType } from '@renderer/domain/shared-kernel';
import { VaultSigning } from '../VaultSigning/VaultSigning';

export const SigningFlow: Record<SigningType, (props: SigningProps) => JSX.Element | null> = {
  [SigningType.MULTISIG]: (props) => <VaultSigning {...props} />,
  [SigningType.PARITY_SIGNER]: (props) => <VaultSigning {...props} />,
  [SigningType.WATCH_ONLY]: () => null,
};

export const Signing = (props: SigningProps) => {
  const signingType = props.accounts[0].signingType;

  return SigningFlow[signingType](props);
};
