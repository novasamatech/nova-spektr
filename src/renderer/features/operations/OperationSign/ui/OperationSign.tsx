import { useUnit } from 'effector-react';

import type { HexString } from '@shared/core';
import { SigningSwitch } from './SigningSwitch';
import { signModel } from '../model/sign-model';

type Props = {
  onGoBack: () => void;
};

export const OperationSign = ({ onGoBack }: Props) => {
  const api = useUnit(signModel.$api);
  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);

  if (!api || !signStore || !signerWallet) return null;

  const onSignResult = (signatures: HexString[], txPayloads: Uint8Array[]) => {
    signModel.events.dataReceived({ signatures, txPayloads });
  };

  return (
    <SigningSwitch
      api={api}
      chainId={signStore.chain.chainId}
      addressPrefix={signStore.chain.addressPrefix}
      signerWaller={signerWallet}
      accounts={signStore.accounts}
      signatory={signStore.signatory || undefined}
      transactions={signStore.transactions}
      onGoBack={onGoBack}
      onResult={onSignResult}
    />
  );
};
