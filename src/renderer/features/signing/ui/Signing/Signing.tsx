import { SigningProps } from '@renderer/features/signing/model';
import { SigningType } from '@renderer/domain/shared-kernel';
import { VaultSigning } from '@renderer/features/signing/ui/VaultSigning/VaultSigning';

export const Signing = (props: SigningProps) => {
  const signingType = props.accounts[0].signingType;

  const getSigningFlow = () => {
    if (signingType === SigningType.MULTISIG || SigningType.PARITY_SIGNER) {
      return <VaultSigning {...props} />;
    }

    return <></>;
  };

  return getSigningFlow();
};
