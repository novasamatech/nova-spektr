import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import wallet_connect_confirm from '@/shared/assets/video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@/shared/assets/video/wallet_connect_confirm.webm';
import { type HexString, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useCountdown } from '@/shared/lib/hooks';
import { ValidationErrors } from '@/shared/lib/utils';
import { Button, Countdown, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { type SigningProps } from '../lib/types';
import { operationSignModel } from '../model/operation-sign-model';
import { walletConnectSign } from '../model/walletConnectSign';

import { WalletConnectQrCode } from 'src/renderer/features/wallet-connect-wallet-pairing';

export const WalletConnect = ({
  apis,
  signerWallet,
  signingPayloads,
  validateBalance,
  onGoBack,
  onResult,
}: SigningProps) => {
  useGate(walletConnectSign.flow, { payloads: signingPayloads });

  const { t } = useI18n();
  const [countdown, resetCountdown] = useCountdown(Object.values(apis));
  const payload = signingPayloads[0];

  const session = useUnit(walletConnectSign.$session);
  const transactions = useUnit(walletConnectSign.$transactions);
  const pairingUri = useUnit(walletConnectSign.$pairingUri);
  const step = useUnit(walletConnectSign.$step);
  const signed = useUnit(walletConnectSign.$signed);

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const account = payload.signatory || payload.account;

  useGate(operationSignModel.SignerGate, account);

  if (!accountUtils.isWcAccount(account)) {
    throw new Error(`Account is not Wallet Connect account, got ${JSON.stringify(account, null, 2)}`);
  }

  useEffect(() => {
    if (countdown <= 0) {
      setValidationError(ValidationErrors.EXPIRED);
    }
  }, [countdown]);

  useEffect(() => {
    if (session) {
      resetCountdown();
    }
  }, [session]);

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
        transactionService.verifySignature(transaction.payload, signature as HexString, payload.account.accountId);
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

  const walletName = session?.peer.metadata.name || t('operation.walletConnect.defaultWalletName');

  const getStatusProps = () => {
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

    // TODO fix failed state
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
      <SmallTitleText>
        {t('operation.walletConnect.signTitle', {
          count: transactions.length || 1,
          walletName,
        })}
      </SmallTitleText>

      <Countdown countdown={transactions.length ? countdown : 0} />

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
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-white opacity-70" />
            <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-4">
              <FootnoteText>{t('operation.walletConnect.expiredDescription')}</FootnoteText>
              <Button size="sm" onClick={onGoBack}>
                {t('operation.walletConnect.tryAgainButton')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex w-full justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <StatusModal {...getStatusProps()} />
    </div>
  );
};
