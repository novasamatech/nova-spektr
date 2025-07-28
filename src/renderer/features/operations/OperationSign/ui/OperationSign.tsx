import { useGate, useUnit } from 'effector-react';

import { type HexString } from '@/shared/core';
import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { walletUtils } from '@/entities/wallet';
import { signModel } from '../model/sign-model';

import { SigningSwitch } from './SigningSwitch';

type Props = {
  onSuccess?: VoidFunction;
  onGoBack: VoidFunction;
};

export const OperationSign = ({ onSuccess, onGoBack }: Props) => {
  useGate(signModel.gates.flow);

  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);

  if (!signStore || !signerWallet) {
    const height = signerWallet && walletUtils.isWalletConnectGroup(signerWallet) ? '430px' : '490px';

    return (
      <Box width="440px" height={height} verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const onSignResult = (signatures: HexString[], payloads: Uint8Array[]) => {
    const payload = signStore.map(({ api, signatory, extrinsic }, index) => ({
      api,
      extrinsic,
      signatory: signatory.accountId,
      signature: signatures[index],
      payload: payloads[index],
    }));

    signModel.signed(payload);
    onSuccess?.();
  };

  return (
    <SigningSwitch
      signerWallet={signerWallet}
      signingPayloads={signStore}
      onGoBack={onGoBack}
      onResult={onSignResult}
    />
  );
};
