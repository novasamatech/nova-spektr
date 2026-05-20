import { useGate, useUnit } from 'effector-react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Alert, FootnoteText, Loader } from '@/shared/ui';
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
  const { t } = useI18n();

  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);
  const batchSplitWarning = useUnit(signModel.$batchSplitWarning);

  if (!signStore || !signerWallet) {
    const height = signerWallet && walletUtils.isWalletConnectGroup(signerWallet) ? '430px' : '490px';

    return (
      <Box width="100%" height={height} verticalAlign="center" horizontalAlign="center" gap={4}>
        <Loader color="primary" />
        <FootnoteText className="text-text-tertiary">{t('signing.loadingSignData')}</FootnoteText>
      </Box>
    );
  }

  const onSignResult = (signatures: HexString[], payloads: Uint8Array[]) => {
    const payload = signStore.map(({ api, signatory, extrinsic }, index) => ({
      api,
      extrinsic,
      signatory: signatory.accountId,
      signature: signatures[index]!,
      payload: payloads[index]!,
    }));

    signModel.signed(payload);
    onSuccess?.();
  };

  return (
    <Box width="100%" direction="column" gap={3}>
      {batchSplitWarning && (
        <div className="px-4">
          <Alert active variant="warn" title={t('signing.batchSplit.title')}>
            {t('signing.batchSplit.description', { chunkCount: batchSplitWarning.extrinsicCountAfterSplit })}
          </Alert>
        </div>
      )}
      <SigningSwitch
        signerWallet={signerWallet}
        signingPayloads={signStore}
        onGoBack={onGoBack}
        onResult={onSignResult}
      />
    </Box>
  );
};
