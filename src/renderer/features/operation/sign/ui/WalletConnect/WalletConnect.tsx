import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { SigningProps } from '@renderer/features/operation';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { useI18n, useWalletConnectClient } from '@renderer/app/providers';
import { DEFAULT_POLKADOT_METHODS } from '@renderer/app/providers/context/WalletConnectContext/const';
import { BodyText, Button, HeadlineText } from '@renderer/shared/ui';
import { useAccount } from '@renderer/entities/account';

const ValidationErrorLabels = {
  [ValidationErrors.INVALID_SIGNATURE]: 'transfer.walletConnect.invalidSignature',
};

export const WalletConnect = ({ api, validateBalance, onGoBack, accounts, transactions, onResult }: SigningProps) => {
  const { t } = useI18n();
  const { verifySignature, createPayload } = useTransaction();
  const { client, connect, disconnect, session } = useWalletConnectClient();
  const { updateAccount } = useAccount();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [isNeedUpdate, setIsNeedUpdate] = useState<boolean>(false);

  const transaction = transactions[0];
  const account = accounts[0];

  useEffect(() => {
    if (txPayload) return;

    (async () => {
      const isCurrentSession = session && account && session.topic === account.signingExtras?.sessionTopic;

      if (!isCurrentSession) {
        if (session) {
          await disconnect();
        }
        await connect({ topic: account.signingExtras?.pairingTopic });

        setIsNeedUpdate(true);
      }

      setupTransaction().catch(() => console.warn('WalletConnect | setupTransaction() failed'));
    })();
  }, [transaction, api]);

  useEffect(() => {
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
    unsignedTx && signTransaction();
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
