import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import wallet_connect_confirm from '@/shared/assets/video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@/shared/assets/video/wallet_connect_confirm.webm';
import { type HexString, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ValidationErrors, getTranslatedErrorMessage } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { WalletConnectQrCode } from '@/features/wallet-connect-wallet-pairing';
import { type SigningProps } from '../lib/types';
import { operationSignModel } from '../model/operation-sign-model';
import { walletConnectSign } from '../model/walletConnectSign';

export const WalletConnect = ({ signerWallet, signingPayloads, validateBalance, onGoBack, onResult }: SigningProps) => {
  useGate(walletConnectSign.flow, { payloads: signingPayloads, accounts: signerWallet?.accounts ?? [] });

  const { t } = useI18n();
  const payload = signingPayloads[0];

  const transactions = useUnit(walletConnectSign.$transactions);
  const pairingUri = useUnit(walletConnectSign.$pairingUri);
  const step = useUnit(walletConnectSign.$step);
  const signed = useUnit(walletConnectSign.$signed);
  const error = useUnit(walletConnectSign.$error);

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const account = payload.signatory;

  useGate(operationSignModel.SignerGate, account);

  if (!accountUtils.isWcAccount(account)) {
    throw new Error(`Account is not Wallet Connect account, got ${JSON.stringify(account, null, 2)}`);
  }

  useEffect(() => {
    if (signed.length) {
      handleSignature(signed.map((x) => x.signature));
    }
  }, [signed]);

  // TODO move validation to effector model
  const handleSignature = async (signatures: HexString[]) => {
    let isVerified;
    let balanceValidationError;

    for (const [index, signature] of signatures.entries()) {
      const transaction = transactions[index];

      isVerified =
        transaction &&
        transactionService.verifySignature(transaction.payload, signature as HexString, payload.signatory.accountId);
      balanceValidationError = validateBalance && (await validateBalance());
    }

    if (isVerified && balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else if (transactions.length) {
      onResult(
        signatures,
        transactions.map((x) => x.payload),
      );
    }
  };

  const walletName = signerWallet?.type === WalletType.NOVA_WALLET ? 'Nova Wallet' : 'WalletConnect';

  const getStatusProps = () => {
    if (step === 'rejected' || step === 'failed') {
      const errorMessage = error?.type
        ? getTranslatedErrorMessage(error.type, t)
        : t('operation.walletConnect.rejected');

      return {
        isOpen: true,
        title: errorMessage,
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
      <SmallTitleText>
        {t('operation.walletConnect.signTitle', {
          count: transactions.length || 1,
          walletName,
        })}
      </SmallTitleText>

      <div className="relative w-full">
        {!pairingUri && (
          <video className="h-[240px]" autoPlay loop>
            <source src={wallet_connect_confirm_webm} type="video/webm" />
            <source src={wallet_connect_confirm} type="video/mp4" />
          </video>
        )}

        {pairingUri && (
          <WalletConnectQrCode
            uri={pairingUri}
            type={signerWallet?.type === WalletType.NOVA_WALLET ? 'novawallet' : 'walletconnect'}
            size={280}
          />
        )}

        {validationError === ValidationErrors.EXPIRED && (
          <>
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-white opacity-70" />
            <div className="absolute top-0 right-0 bottom-0 left-0 flex flex-col items-center justify-center gap-4">
              <FootnoteText>{t('operation.walletConnect.expiredDescription')}</FootnoteText>
              <Button size="sm" onClick={onGoBack}>
                {t('operation.walletConnect.tryAgainButton')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex w-full justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <StatusModal {...getStatusProps()} />
    </div>
  );
};
