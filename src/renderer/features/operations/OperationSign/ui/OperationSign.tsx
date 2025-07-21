import { useGate, useUnit } from 'effector-react';

import { type HexString } from '@/shared/core';
import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { getExtrinsic } from '@/entities/transaction';
import { walletUtils } from '@/entities/wallet';
import { signModel } from '../model/sign-model';

import { SigningSwitch } from './SigningSwitch';

type Props = {
  onSuccess?: VoidFunction;
  onGoBack: VoidFunction;
};

export const OperationSign = ({ onSuccess, onGoBack }: Props) => {
  useGate(signModel.gates.flow);

  const apis = useUnit(signModel.$apis);
  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);

  if (!apis || !signStore || !signerWallet) {
    const height = walletUtils.isWalletConnectGroup(signerWallet) ? '430px' : '490px';

    return (
      <Box width="440px" height={height} verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const onSignResult = (signatures: HexString[], txPayloads: Uint8Array[]) => {
    // TODO move this wrapping to sign store
    const extrinsics = signStore.signingPayloads.map(({ transaction }) => {
      return getExtrinsic[transaction.type](transaction.args, apis[transaction.chainId]);
    });
    signModel.events.dataReceived({ extrinsics, signatures, txPayloads });
    onSuccess?.();
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
