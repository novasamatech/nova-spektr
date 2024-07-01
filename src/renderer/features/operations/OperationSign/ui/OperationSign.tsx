import { useUnit } from 'effector-react';

import type { HexString } from '@shared/core';
import { SigningSwitch } from './SigningSwitch';
import { signModel } from '../model/sign-model';

type Props = {
  onGoBack: () => void;
};

export const OperationSign = ({ onGoBack }: Props) => {
  const apis = useUnit(signModel.$apis);
  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);

  if (!apis || !signStore || !signerWallet) return null;

  const onSignResult = (signatures: HexString[], txPayloads: Uint8Array[]) => {
    signModel.events.dataReceived({ signatures, txPayloads });
  };

  return (
    <SigningSwitch
      apis={apis}
      signerWallet={signerWallet}
      signingPayloads={signStore.signingPayloads}
      onGoBack={onGoBack}
      onResult={onSignResult}
    />
  );
};
