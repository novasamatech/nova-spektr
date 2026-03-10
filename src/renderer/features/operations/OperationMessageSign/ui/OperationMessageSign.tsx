import { useGate, useUnit } from 'effector-react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { messageSignModel } from '../model/message-sign-model';

import { MessageSigningSwitch } from './MessageSigningSwitch';

type Props = {
  onGoBack: () => void;
};

export const OperationMessageSign = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  useGate(messageSignModel.gates.flow);

  const signStore = useUnit(messageSignModel.$signStore);
  const signerWallet = useUnit(messageSignModel.$signerWallet);

  if (!signStore || !signerWallet) {
    return (
      <Box verticalAlign="center" horizontalAlign="center" padding={4} gap={4}>
        <Loader color="primary" />
        <FootnoteText className="text-text-tertiary">{t('signing.loadingSignData')}</FootnoteText>
      </Box>
    );
  }

  const onSignResult = (signature: HexString) => {
    messageSignModel.signed({
      signature,
      accountId: signStore.signatory.accountId,
    });
  };

  return (
    <MessageSigningSwitch signerWallet={signerWallet} payload={signStore} onGoBack={onGoBack} onResult={onSignResult} />
  );
};
