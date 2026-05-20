import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { WalletIcon } from '@/shared/ui-entities';
import { type MessageSigningProps } from '../lib/types';
import { extensionMessageSign } from '../model/extension-message-sign';

export const ExtensionMessageSign = ({ payload, signerWallet, onGoBack, onResult }: MessageSigningProps) => {
  useGate(extensionMessageSign.flow, { payload });

  const { t } = useI18n();

  const step = useUnit(extensionMessageSign.$step);
  const signature = useUnit(extensionMessageSign.$signature);

  useEffect(() => {
    if (signature) {
      onResult(signature);
    }
  }, [signature]);

  const isError = step === 'rejected' || step === 'failed';

  return (
    <div className="flex flex-col items-center gap-y-2.5">
      {signerWallet && (
        <div className="mb-1 flex h-8 items-center gap-x-2">
          <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>
          <WalletIcon type={signerWallet.type} size={16} />
          <FootnoteText className="text-text-secondary">{signerWallet.name}</FootnoteText>
        </div>
      )}

      <SmallTitleText>{t('signing.signingInProgress')}</SmallTitleText>

      <div className="flex w-full">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <StatusModal
        isOpen={isError}
        title={t('operation.walletConnect.rejected')}
        content={<Animation variant="error" />}
        onClose={onGoBack}
      />
    </div>
  );
};
