import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useGate, useUnit } from 'effector-react';

import { SigningProps } from '@renderer/features/operation';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';
import { useI18n } from '@renderer/app/providers';
import { Button, ConfirmModal, Countdown, FootnoteText, SmallTitleText, StatusModal } from '@renderer/shared/ui';
import { walletConnectModel, DEFAULT_POLKADOT_METHODS, walletConnectUtils } from '@renderer/entities/walletConnect';
import { chainsService } from '@renderer/entities/network';
import { useCountdown } from '@renderer/shared/lib/hooks';
import wallet_connect_confirm from '@video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@video/wallet_connect_confirm.webm';
import { HexString } from '@renderer/shared/core';
import { Animation } from '@renderer/shared/ui/Animation/Animation';
import { walletConnectSignModel } from '../../model/wallet-connect-sign-model';
import { isConnectedStep, isReadyToReconnectStep, isReconnectingStep, isRejectedStep } from '../../lib/utils';
import { signModel } from '../../model/sign-model';
import { walletModel } from '@renderer/entities/wallet';

export const WalletConnect = ({
  api,
  validateBalance,
  onGoBack,
  accounts,
  signatory,
  transactions,
  onResult,
}: SigningProps) => {
  const { t } = useI18n();
  const { verifySignature, createPayload } = useTransaction();
  const [countdown, resetCountdown] = useCountdown(api);

  const session = useUnit(walletConnectModel.$session);
  const client = useUnit(walletConnectModel.$client);
  const reconnectStep = useUnit(walletConnectSignModel.$reconnectStep);
  const isSigningRejected = useUnit(walletConnectSignModel.$isSigningRejected);
  const signature = useUnit(walletConnectSignModel.$signature);
  const isStatusShown = useUnit(walletConnectSignModel.$isStatusShown);
  const storedAccounts = useUnit(walletModel.$accounts);

  const chains = chainsService.getChainsData();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const transaction = transactions[0];
  const account = signatory || accounts[0];

  useGate(signModel.SignerGate, account);

  useEffect(() => {
    if (txPayload || !client) return;

    const sessions = client.session.getAll();
    const storedAccount = storedAccounts.find((a) => a.walletId === account.walletId);

    const storedSession = sessions.find((s) => s.topic === storedAccount?.signingExtras?.sessionTopic);

    if (storedSession) {
      walletConnectModel.events.sessionUpdated(storedSession);

      setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
    } else {
      walletConnectSignModel.events.reconnectModalShown();
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
      const { payload, unsigned } = await createPayload(transaction, api);

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
    walletConnectSignModel.events.reconnectStarted({
      chains: walletConnectUtils.getWalletConnectChains(chains),
      pairing: { topic: account.signingExtras?.pairingTopic },
    });
  };

  const signTransaction = async () => {
    if (!api || !client || !session) return;

    walletConnectSignModel.events.signingStarted({
      client,
      payload: {
        // eslint-disable-next-line i18next/no-literal-string
        chainId: `polkadot:${transaction.chainId.slice(2, 34)}`,
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
    const isVerified = txPayload && verifySignature(txPayload, signature as HexString, accounts[0].accountId);

    const balanceValidationError = validateBalance && (await validateBalance());

    if (isVerified && balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else {
      if (unsignedTx) {
        onResult([signature], [unsignedTx]);
      }
    }
  };

  const walletName = session?.peer.metadata.name || t('operation.walletConnect.defaultWalletName');

  const getStatusProps = () => {
    if (isReconnectingStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.reconnect.reconnecting'),
        content: <Animation variant="loading" loop />,
        onClose: () => {
          walletConnectSignModel.events.reconnectAborted(), onGoBack();
        },
      };
    }

    if (isConnectedStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.reconnect.connected'),
        content: <Animation variant="success" />,
        onClose: () => {
          walletConnectSignModel.events.reconnectDone();
          setupTransaction();
        },
      };
    }

    if (isRejectedStep(reconnectStep)) {
      return {
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          walletConnectSignModel.events.reconnectAborted();
          onGoBack();
        },
      };
    }

    if (isSigningRejected) {
      return {
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: () => {
          walletConnectSignModel.events.reset();
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
        isOpen={isReadyToReconnectStep(reconnectStep)}
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
