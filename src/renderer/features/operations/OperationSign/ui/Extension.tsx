import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { ValidationErrors } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { WalletIcon } from '@/shared/ui-entities';
import { ValidationErrorLabels } from '../lib/constants';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type SigningProps } from '../lib/types';
import { operationSignModel } from '../model/operation-sign-model';
import { type SignResponse, polkadotExtensionSign } from '../model/polkadotExtensionSign';

export const Extension = ({ signingPayloads, signerWallet, validateBalance, onGoBack, onResult }: SigningProps) => {
  const payload = signingPayloads[0];
  const signatory = payload?.signatory;

  useGate(polkadotExtensionSign.flow, { payloads: signingPayloads, signatory: signatory ?? null });

  const { t } = useI18n();

  const step = useUnit(polkadotExtensionSign.$step);
  const signed = useUnit(polkadotExtensionSign.$signed);
  const signingCurrent = useUnit(polkadotExtensionSign.$signingCurrent);
  const signingTotal = useUnit(polkadotExtensionSign.$signingTotal);

  const [validationError, setValidationError] = useState<ValidationErrors>();

  useGate(operationSignModel.SignerGate, signatory);

  useEffect(() => {
    if (signed.length) {
      handleSignature(signed);
    }
  }, [signed]);

  // TODO move validation to effector model
  const handleSignature = async (response: SignResponse[]) => {
    const signatures = response.map((x) => x.signature);
    const payloads = response.map((x) => x.txPayload.payload);

    const isVerified = operationSignUtils.verifySignatures({
      payloads,
      signatures,
      accountIds: signingPayloads.map((p) => p.signatory.accountId),
    });

    if (!isVerified) {
      setValidationError(ValidationErrors.INVALID_SIGNATURE);

      return;
    }

    const balanceValidationError = validateBalance && (await validateBalance());

    if (balanceValidationError) {
      setValidationError(balanceValidationError);

      return;
    }

    onResult(signatures, payloads);
  };

  const getStatusProps = () => {
    if (validationError) {
      return {
        isOpen: true,
        title: t(ValidationErrorLabels[validationError]),
        content: <Animation variant="error" />,
        onClose: () => {
          onGoBack();
        },
      };
    }

    if (step === 'rejected') {
      return {
        isOpen: true,
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          onGoBack();
        },
      };
    }

    if (step === 'failed') {
      return {
        isOpen: true,
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          onGoBack();
        },
      };
    }

    return {
      isOpen: false,
      title: '',
      content: null,
      onClose: () => {},
    };
  };

  return (
    <div className="flex w-full flex-col items-center gap-y-2.5 rounded-b-lg p-4">
      {signerWallet && (
        <div className="mb-1 flex h-8 items-center gap-x-2">
          <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>
          <WalletIcon type={signerWallet.type} size={16} />
          <FootnoteText className="text-text-secondary">{signerWallet.name}</FootnoteText>
        </div>
      )}

      <SmallTitleText>
        {signingTotal > 1 && signingCurrent > 0
          ? t('signing.signingMultipleInProgress', { current: signingCurrent, total: signingTotal })
          : t('signing.signingInProgress')}
      </SmallTitleText>

      <div className="mt-5 flex w-full">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <StatusModal {...getStatusProps()} />
    </div>
  );
};
