import { ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import init, { Encoder } from 'raptorq';
import { useEffect, useState } from 'react';

import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import QrMultiframeGenerator from '@renderer/components/common/QrCode/QrGenerator/QrMultiframeTxGenerator';
import { TRANSACTION_BULK } from '@renderer/components/common/QrCode/QrReader/common/constants';
import { useI18n } from '@renderer/context/I18nContext';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import { AccountDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { toAddress } from '@renderer/shared/utils/address';
import { Button } from '@renderer/components/ui-redesign';
import { QrGeneratorContainer } from '@renderer/components/common';
import {
  createMultipleSignPayload,
  createSignPayload,
} from '@renderer/components/common/QrCode/QrGenerator/common/utils';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: AccountDS[];
  addressPrefix: number;
  transactions: Transaction[];
  countdown: number;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (unsigned: UnsignedTransaction[]) => void;
};

const ScanMultiframeQr = ({
  api,
  chainId,
  accounts,
  addressPrefix,
  transactions,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [encoder, setEncoder] = useState<Encoder>();
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  useEffect(() => {
    if (unsignedTransactions.length) return;

    setupTransactions().catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, []);

  const setupTransactions = async (): Promise<void> => {
    const transactionPromises = accounts.map((account, index) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      return (async () => {
        const { payload, unsigned } = await createPayload(transactions[index], api);

        return {
          unsigned,
          signPayload: createSignPayload(address, Command.Transaction, payload, chainId),
          transactionData: transactions[index],
        };
      })();
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    await init();

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setBulkTransactions(createMultipleSignPayload(transactionsEncoded));
    setUnsignedTransactions(txRequests.map((t) => t.unsigned));
    setEncoder(Encoder.with_defaults(bulk, 128));
  };

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <div className="pt-4 flex flex-col items-center w-full">
      <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransactions}>
        {bulkTxExist && encoder && <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />}
      </QrGeneratorContainer>

      <div className="flex w-full justify-between mt-3">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!bulkTxExist || countdown === 0} onClick={() => onResult(unsignedTransactions)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </div>
  );
};

export default ScanMultiframeQr;
