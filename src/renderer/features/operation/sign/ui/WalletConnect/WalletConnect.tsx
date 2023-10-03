import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useUnit } from 'effector-react';

import { SigningProps } from '@renderer/features/operation';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { useI18n } from '@renderer/app/providers';
import { BodyText, Button, HeadlineText } from '@renderer/shared/ui';
import { useAccount } from '@renderer/entities/account';
import * as walletConnectModel from '@renderer/entities/walletConnect';
import { DEFAULT_POLKADOT_METHODS, getWalletConnectChains } from '@renderer/entities/walletConnect';
import { chainsService } from '@renderer/entities/network';

const ValidationErrorLabels = {
  [ValidationErrors.INVALID_SIGNATURE]: 'transfer.walletConnect.invalidSignature',
};

export const WalletConnect = ({ api, validateBalance, onGoBack, accounts, transactions, onResult }: SigningProps) => {
  const { t } = useI18n();
  const { verifySignature, createPayload } = useTransaction();
  const { updateAccount } = useAccount();

  const session = useUnit(walletConnectModel.$session);
  const client = useUnit(walletConnectModel.$client);
  const connect = useUnit(walletConnectModel.events.connect);
  const updateSession = useUnit(walletConnectModel.updateSession);

  const chains = chainsService.getChainsData();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [isNeedUpdate, setIsNeedUpdate] = useState<boolean>(false);

  const transaction = transactions[0];
  const account = accounts[0];

  useEffect(() => {
    if (txPayload || !client) return;

    (async () => {
      const isCurrentSession = session && account && session.topic === account.signingExtras?.sessionTopic;

      if (!isCurrentSession) {
        const sessions = client.session.getAll();

        const newSession = sessions.find((s) => s.topic === account.signingExtras?.sessionTopic);

        if (newSession) {
          updateSession(newSession);
        } else {
          await connect({
            chains: getWalletConnectChains(chains),
            pairing: { topic: account.signingExtras?.pairingTopic },
          });
        }

        setIsNeedUpdate(true);
      }

      setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
    })();
  }, [transaction, api]);

  useEffect(() => {
    console.log('xcm2', isNeedUpdate);
    if (isNeedUpdate) {
      setIsNeedUpdate(false);

      updateAccount({
        ...account,
        signingExtras: {
          ...account.signingExtras,
          sessionTopic: session?.topic,
        },
      });
    }
  }, [session]);

  useEffect(() => {
    console.log('xcmTx', unsignedTx);

    if (unsignedTx) {
      signTransaction();
    }
  }, [unsignedTx]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await createPayload(transaction, api);

      setTxPayload(payload);
      setUnsignedTx(unsigned);
    } catch (error) {
      console.warn(error);
    }
  };

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const signTransaction = async () => {
    if (!api || !client || !session) return;

    console.log('xcmTx2', session.topic);

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

    console.log('xcmTx2', result);

    handleSignature(result.signature);
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

  return (
    <div className="flex flex-col items-center p-4 gap-y-2.5 w-[440px] rounded-b-lg">
      <HeadlineText>
        {t('operation.walletConnectTitle', {
          walletName: session?.peer.metadata.name || t('operation.defaultWalletName'),
        })}
      </HeadlineText>
      <BodyText> {t(ValidationErrorLabels[validationError as keyof typeof ValidationErrorLabels])}</BodyText>
      <div className="flex w-full justify-between mt-5">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>
    </div>
  );
};
