import { type UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { chainsService } from '@shared/api/network';
import wallet_connect_confirm from '@shared/assets/video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@shared/assets/video/wallet_connect_confirm.webm';
import { type HexString } from '@shared/core';
import { useCountdown } from '@shared/lib/hooks';
import { ValidationErrors } from '@shared/lib/utils';
import { Button, ConfirmModal, Countdown, FootnoteText, SmallTitleText, StatusModal } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';
import { transactionService, useTransaction } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';
import { DEFAULT_POLKADOT_METHODS, walletConnectModel, walletConnectUtils } from '@entities/walletConnect';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type InnerSigningProps } from '../lib/types';
import { operationSignModel } from '../model/operation-sign-model';
import { signWcModel } from '../model/sign-wc-model';

export const WalletConnect = ({ apis, signingPayloads, validateBalance, onGoBack, onResult }: InnerSigningProps) => {
  const { t } = useI18n();
  const { verifySignature } = useTransaction();
  const [countdown, resetCountdown] = useCountdown(Object.values(apis));
  const payload = signingPayloads[0];
  const api = apis[payload.chain.chainId];

  const wallets = useUnit(walletModel.$wallets);
  const session = useUnit(walletConnectModel.$session);
  const client = useUnit(walletConnectModel.$client);
  const reconnectStep = useUnit(signWcModel.$reconnectStep);
  const isSigningRejected = useUnit(signWcModel.$isSigningRejected);
  const signature = useUnit(signWcModel.$signature);
  const isStatusShown = useUnit(signWcModel.$isStatusShown);

  const chains = chainsService.getChainsData();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const transaction = payload.transaction;
  const account = payload.signatory || payload.account;

  useGate(operationSignModel.SignerGate, account);

  useEffect(() => {
    if (txPayload || !client) {
      return;
    }

    const sessions = client.session.getAll();
    const storedAccount = walletUtils.getAccountsBy(wallets, (a) => a.walletId === account.walletId)[0];
    const storedSession = sessions.find((s) => s.topic === storedAccount?.signingExtras?.sessionTopic);

    if (storedSession) {
      walletConnectModel.events.sessionUpdated(storedSession);

      setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
    } else {
      signWcModel.events.reconnectModalShown();
    }
  }, [transaction, api]);

  useEffect(() => {
    if (unsignedTx) {
      signTransaction();
    }
  }, [unsignedTx]);

  useEffect(() => {
    if (countdown <= 0) {
      setValidationError(ValidationErrors.EXPIRED);
    }
  }, [countdown]);

  useEffect(() => {
    if (signature) {
      handleSignature(signature as HexString);
    }
  }, [signature]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await transactionService.createPayload(transaction, api);

      setTxPayload(payload);
      setUnsignedTx(unsigned);

      if (payload) {
        resetCountdown();
      }
    } catch (error) {
      console.warn(error);
    }
  };

  const reconnect = () => {
    signWcModel.events.reconnectStarted({
      chains: walletConnectUtils.getWalletConnectChains(chains),
      pairing: { topic: account.signingExtras?.pairingTopic },
    });
  };

  const signTransaction = async () => {
    if (!api || !client || !session) {
      return;
    }

    signWcModel.events.signingStarted({
      client,
      payload: {
        // eslint-disable-next-line i18next/no-literal-string
        chainId: walletConnectUtils.getWalletConnectChainId(transaction.chainId),
        topic: session.topic,
        request: {
          method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
          params: {
            address: transaction.address,
            transactionPayload: unsignedTx,
          },
        },
      },
    });
  };

  const handleSignature = async (signature: HexString) => {
    const isVerified = txPayload && verifySignature(txPayload, signature as HexString, payload.account.accountId);

    const balanceValidationError = validateBalance && (await validateBalance());

    if (isVerified && balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else if (txPayload) {
      onResult([signature], [txPayload]);
    }
  };

  const walletName = session?.peer.metadata.name || t('operation.walletConnect.defaultWalletName');

  const getStatusProps = () => {
    if (operationSignUtils.isReconnectingStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.reconnect.reconnecting'),
        content: <Animation variant="loading" loop />,
        onClose: () => {
          signWcModel.events.reconnectAborted();
          onGoBack();
        },
      };
    }

    if (operationSignUtils.isConnectedStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.reconnect.connected'),
        content: <Animation variant="success" />,
        onClose: () => {
          signWcModel.events.reconnectDone();
          setupTransaction();
        },
      };
    }

    if (operationSignUtils.isRejectedStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          signWcModel.events.reconnectAborted();
          onGoBack();
        },
      };
    }

    if (isSigningRejected) {
      return {
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          signWcModel.events.reset();
          onGoBack();
        },
      };
    }

    return {
      title: '',
      content: <></>,
      onClose: () => {},
    };
  };

  return (
    <div className="flex flex-col items-center p-4 gap-y-2.5 w-[440px] rounded-b-lg">
      <SmallTitleText>
        {t('operation.walletConnect.signTitle', {
          walletName,
        })}
      </SmallTitleText>

      <Countdown countdown={txPayload ? countdown : 0} />

      <div className="relative">
        <video className="object-contain h-[240px]" autoPlay loop>
          <source src={wallet_connect_confirm_webm} type="video/webm" />
          <source src={wallet_connect_confirm} type="video/mp4" />
        </video>

        {validationError === ValidationErrors.EXPIRED && (
          <>
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-70" />
            <div className="absolute top-0 left-0 right-0 bottom-0 gap-4 flex flex-col items-center justify-center">
              <FootnoteText>{t('operation.walletConnect.expiredDescription')}</FootnoteText>
              <Button size="sm" onClick={onGoBack}>
                {t('operation.walletConnect.tryAgainButton')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex w-full justify-between mt-5">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>

      <ConfirmModal
        panelClass="w-[300px]"
        isOpen={operationSignUtils.isReadyToReconnectStep(reconnectStep)}
        confirmText={t('operation.walletConnect.reconnect.confirmButton')}
        cancelText={t('operation.walletConnect.reconnect.cancelButton')}
        onClose={onGoBack}
        onConfirm={reconnect}
      >
        <SmallTitleText align="center">
          {t('operation.walletConnect.reconnect.title', {
            walletName,
          })}
        </SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {t('operation.walletConnect.reconnect.description')}
        </FootnoteText>
      </ConfirmModal>

      <StatusModal isOpen={isStatusShown} {...getStatusProps()} />
    </div>
  );
};
