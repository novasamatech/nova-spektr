import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useUnit } from 'effector-react';

import { SigningProps } from '@renderer/features/operation';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';
import { useI18n } from '@renderer/app/providers';
import { Button, ConfirmModal, Countdown, FootnoteText, SmallTitleText, StatusModal } from '@renderer/shared/ui';
import { walletConnectModel, DEFAULT_POLKADOT_METHODS, getWalletConnectChains } from '@renderer/entities/walletConnect';
import { chainsService } from '@renderer/entities/network';
import { useCountdown, useToggle } from '@renderer/shared/lib/hooks';
import wallet_connect_confirm from '@video/wallet_connect_confirm.mp4';
import wallet_connect_confirm_webm from '@video/wallet_connect_confirm.webm';
import { HexString } from '@renderer/shared/core';
import { Animation } from '@renderer/shared/ui/Animation/Animation';

export const WalletConnect = ({ api, validateBalance, onGoBack, accounts, transactions, onResult }: SigningProps) => {
  const { t } = useI18n();
  const { verifySignature, createPayload } = useTransaction();
  const [countdown, resetCountdown] = useCountdown(api);

  const session = useUnit(walletConnectModel.$session);
  const client = useUnit(walletConnectModel.$client);
  const connect = useUnit(walletConnectModel.events.connect);
  const sessionUpdated = useUnit(walletConnectModel.events.sessionUpdated);

  const chains = chainsService.getChainsData();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [isNeedUpdate, setIsNeedUpdate] = useState<boolean>(false);
  const [isReconnectModalOpen, setIsReconnectModalOpen] = useState<boolean>(false);
  const [isReconnectingModalOpen, setIsReconnectingModalOpen] = useState<boolean>(false);
  const [isConnectedModalOpen, setIsConnectedModalOpen] = useState<boolean>(false);
  const [isRejectedStatusOpen, toggleRejectedStatus] = useToggle();
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const transaction = transactions[0];
  const account = accounts[0];

  useEffect(() => {
    if (txPayload || !client) return;

    const isCurrentSession = session && account && session.topic === account.signingExtras?.sessionTopic;

    if (isCurrentSession) {
      setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
    } else {
      const sessions = client.session.getAll();

      const storedSession = sessions.find((s) => s.topic === account.signingExtras?.sessionTopic);

      if (storedSession) {
        sessionUpdated(storedSession);
        setIsNeedUpdate(true);

        setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
      } else {
        setIsReconnectModalOpen(true);
      }
    }
  }, [transaction, api]);

  useEffect(() => {
    if (isNeedUpdate) {
      setIsNeedUpdate(false);

      if (session?.topic) {
        walletConnectModel.events.currentSessionTopicUpdated(session?.topic);
      }
    }
  }, [session]);

  useEffect(() => {
    if (unsignedTx) {
      signTransaction();
    }
  }, [unsignedTx]);

  useEffect(() => {
    if (isReconnectingModalOpen && session?.topic === account.signingExtras?.sessionTopic) {
      setIsReconnectingModalOpen(false);
      setIsConnectedModalOpen(true);
    }
  }, [isReconnectingModalOpen]);

  useEffect(() => {
    if (countdown <= 0) {
      setValidationError(ValidationErrors.EXPIRED);
    }
  }, [countdown]);

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

  const reconnect = async () => {
    setIsReconnectModalOpen(false);
    setIsReconnectingModalOpen(true);

    connect({
      chains: getWalletConnectChains(chains),
      pairing: { topic: account.signingExtras?.pairingTopic },
    });

    setIsNeedUpdate(true);
  };

  const handleReconnect = () => {
    reconnect()
      .then(setupTransaction)
      .catch(() => {
        console.warn('WalletConnect | setupTransaction() failed');
        toggleRejectedStatus();
      });
  };

  const signTransaction = async () => {
    if (!api || !client || !session) return;

    try {
      const result = await client.request<{
        payload: string;
        signature: HexString;
      }>({
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
      });

      if (result.signature) {
        handleSignature(result.signature);
      }
    } catch (e) {
      console.warn(e);
      toggleRejectedStatus();
    }
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
    if (isReconnectingModalOpen) {
      return {
        title: t('operation.walletConnect.reconnect.reconnecting'),
        content: <Animation variant="loading" loop />,
        onClose: onGoBack,
      };
    }

    if (isConnectedModalOpen) {
      return {
        title: t('operation.walletConnect.reconnect.connected'),
        content: <Animation variant="success" />,
        onClose: () => setIsConnectedModalOpen(false),
      };
    }

    if (isRejectedStatusOpen) {
      return {
        title: t('operation.walletConnect.rejected'),
        content: <Animation variant="error" />,
        onClose: onGoBack,
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

      <Countdown countdown={countdown} />

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
        isOpen={isReconnectModalOpen}
        confirmText={t('operation.walletConnect.reconnect.confirmButton')}
        cancelText={t('operation.walletConnect.reconnect.cancelButton')}
        onClose={onGoBack}
        onConfirm={handleReconnect}
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

      <StatusModal
        isOpen={isReconnectingModalOpen || isConnectedModalOpen || isRejectedStatusOpen}
        {...getStatusProps()}
      />
    </div>
  );
};
