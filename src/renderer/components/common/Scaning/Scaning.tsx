import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { QrTxGenerator, QrGeneratorContainer } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  transaction: Transaction;
  account: Account | MultisigAccount;
  explorers?: Explorer[];
  addressPrefix: number;
  countdown: number;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (unsignedTx: UnsignedTransaction) => void;
};

export const Scanning = ({
  api,
  chainId,
  transaction,
  account,
  explorers,
  addressPrefix,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await createPayload(transaction, api);

      setTxPayload(payload);
      setUnsignedTx(unsigned);

      if (payload) {
        onResetCountdown();
      }
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    setupTransaction();
  }, []);

  const address = transaction.address;

  return (
    <div className="pt-4 flex flex-col items-center w-full">
      {isMultisig(account) && (
        <div className="flex items-center gap-x-0.5 mb-2">
          <FootnoteText className="text-text-secondary">{t('signing.signatory')}</FootnoteText>
          <AddressWithExplorers
            address={account.accountId}
            name={account.name}
            signType={account.signingType}
            explorers={explorers}
            addressPrefix={addressPrefix}
          />
        </div>
      )}

      <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransaction}>
        {txPayload && <QrTxGenerator cmd={0} payload={txPayload} address={address} genesisHash={chainId} />}
      </QrGeneratorContainer>

      <footer className="flex w-full justify-between mt-3 pl-2">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!unsignedTx || countdown === 0} onClick={() => onResult(unsignedTx!)}>
          {t('signing.continueButton')}
        </Button>
      </footer>
    </div>
  );
};
