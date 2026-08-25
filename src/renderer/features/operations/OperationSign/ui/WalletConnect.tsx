import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import wallet_connect_confirm from '@/shared/assets/video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@/shared/assets/video/wallet_connect_confirm.webm';
import { type HexString, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ValidationErrors } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Modal } from '@/shared/ui-kit';
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
  const chain = useUnit(walletConnectSign.$chain);

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const account = payload?.signatory;

  useGate(operationSignModel.SignerGate, account!);

  if (!account || !accountUtils.isWcAccount(account)) {
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
        transactionService.verifySignature(transaction.payload, signature as HexString, payload!.signatory.accountId);
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

  const isErrorModalOpen = step === 'rejected' || step === 'failed';
  const isReconnectModalOpen = step === 'reconnect';
  const isReconnecting = step === 'reconnecting';
  const isReconnected = step === 'reconnected';

  return (
    <div className="flex w-full flex-col items-center gap-y-2.5 rounded-b-lg p-4">
      <SmallTitleText>
        {t('operation.walletConnect.signTitle', {
          count: transactions.length || 1,
          walletName,
        })}
      </SmallTitleText>

      <div className="relative flex w-full justify-center">
        {!pairingUri && (
          <video className="h-[240px]" autoPlay loop>
            <source src={wallet_connect_confirm_webm} type="video/webm" />
            <source src={wallet_connect_confirm} type="video/mp4" />
          </video>
        )}

        {pairingUri && !isReconnecting && (
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

      <Modal size="fit" isOpen={isReconnectModalOpen} onToggle={(open) => !open && onGoBack()}>
        <Modal.Content>
          <div className="flex w-full max-w-[240px] flex-col items-center justify-center px-1">
            <Animation variant="error" />
            <SmallTitleText className="mb-4 text-center">
              {t('operation.walletConnect.reconnect.title', { walletName })}
            </SmallTitleText>
            <FootnoteText className="text-center text-text-secondary">
              {t('operation.walletConnect.reconnect.chainMissing', { chain: chain?.name ?? '' })}
            </FootnoteText>
          </div>
        </Modal.Content>
        <Modal.Footer>
          <div className="flex w-full gap-2">
            <Button className="w-full" variant="text" size="sm" onClick={onGoBack}>
              {t('operation.walletConnect.reconnect.cancelButton')}
            </Button>
            <Button className="w-full" size="sm" onClick={() => walletConnectSign.reconnectRequested()}>
              {t('operation.walletConnect.reconnect.confirmButton')}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <StatusModal
        isOpen={isReconnecting}
        title={
          pairingUri ? t('operation.walletConnect.failedTitle') : t('operation.walletConnect.reconnect.reconnecting')
        }
        description={pairingUri ? t('operation.walletConnect.failedDescription') : undefined}
        className={pairingUri ? 'w-[440px]' : undefined}
        content={
          pairingUri ? (
            <WalletConnectQrCode
              uri={pairingUri}
              type={signerWallet?.type === WalletType.NOVA_WALLET ? 'novawallet' : 'walletconnect'}
            />
          ) : (
            <Animation variant="loading" loop />
          )
        }
        onClose={onGoBack}
      />

      <StatusModal
        isOpen={isReconnected}
        title={t('operation.walletConnect.reconnect.connected')}
        content={<Animation variant="success" />}
        onClose={() => {}}
      />

      <Modal size="fit" isOpen={isErrorModalOpen} onToggle={(open) => !open && onGoBack()}>
        <Modal.Content>
          <div className="flex w-full max-w-[240px] flex-col items-center justify-center px-1">
            <Animation variant="error" />
            <SmallTitleText className="mb-4">{error?.title}</SmallTitleText>
            <FootnoteText className="text-center text-text-secondary">{error?.description}</FootnoteText>
          </div>
        </Modal.Content>
        <Modal.Footer>
          <Button className="w-full" size="sm" onClick={onGoBack}>
            {t('operation.closeButton')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
