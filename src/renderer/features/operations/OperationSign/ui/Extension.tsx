import { useGate, useUnit } from 'effector-react';
import { t } from 'i18next';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { ValidationErrors } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { WalletIcon } from '@/shared/ui-entities';
import { transactionService } from '@/entities/transaction';
import { type SigningProps } from '../lib/types';
import { operationSignModel } from '../model/operation-sign-model';
import { type SignResponse, polkadotExtensionSign } from '../model/polkadotExtensionSign';

const ValidationErrorLabels: Record<ValidationErrors, string> = {
  [ValidationErrors.EXPIRED]: t('transfer.expired'),
  [ValidationErrors.INVALID_ADDRESS]: t('transfer.invalidAddress'),
  [ValidationErrors.INSUFFICIENT_BALANCE]: t('transfer.notEnoughBalanceError'),
  [ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE]: t('transfer.notEnoughBalanceForFeeError'),
  [ValidationErrors.INVALID_SIGNATURE]: t('transfer.invalidSignature'),
  [ValidationErrors.ADDRESS_REQUIRED]: t('transfer.noSignatoryError'),
  [ValidationErrors.AMOUNT_REQUIRED]: t('transfer.noAmount'),
};

export const Extension = ({ signingPayloads, signerWallet, validateBalance, onGoBack, onResult }: SigningProps) => {
  useGate(polkadotExtensionSign.flow, { payloads: signingPayloads });

  const { t } = useI18n();
  const payload = signingPayloads[0];

  const step = useUnit(polkadotExtensionSign.$step);
  const signed = useUnit(polkadotExtensionSign.$signed);

  // TODO show validation error
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const account = payload.signatory;

  useGate(operationSignModel.SignerGate, account);

  useEffect(() => {
    if (signed.length) {
      handleSignature(signed);
    }
  }, [signed]);

  // TODO move validation to effector model
  const handleSignature = async (response: SignResponse[]) => {
    let isVerified;
    let balanceValidationError;

    for (const { signature, txPayload } of response) {
      isVerified = transactionService.verifySignature(txPayload.payload, signature, payload.signatory.accountId);
      balanceValidationError = validateBalance && (await validateBalance());
    }

    if (isVerified && balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    }

    onResult(
      response.map((x) => x.signature),
      response.map((x) => x.txPayload.payload),
    );
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
    <div className="flex w-[440px] flex-col items-center gap-y-2.5 rounded-b-lg p-4">
      {signerWallet && (
        <div className="mb-1 flex h-8 w-full items-center justify-center">
          <div className="flex h-full items-center justify-center gap-x-0.5">
            <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>

            <div className="flex w-full items-center gap-x-2 px-2">
              <WalletIcon type={signerWallet.type} size={16} />
              <FootnoteText className="w-max text-text-secondary">{signerWallet.name}</FootnoteText>
            </div>
          </div>
        </div>
      )}

      <SmallTitleText>Signing...</SmallTitleText>

      <div className="mt-5 flex w-full justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <StatusModal {...getStatusProps()} />
    </div>
  );
};
