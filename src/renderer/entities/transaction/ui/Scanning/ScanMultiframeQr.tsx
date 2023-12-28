import { ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import init, { Encoder } from 'raptorq';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { Transaction, useTransaction } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import { Button } from '@shared/ui';
import type { Account, ChainId, ShardAccount } from '@shared/core';
import { SigningType, Wallet } from '@shared/core';
import { createSubstrateSignPayload, createMultipleSignPayload } from '../QrCode/QrGenerator/common/utils';
import { TRANSACTION_BULK } from '../QrCode/common/constants';
import { QrMultiframeGenerator } from '../QrCode/QrGenerator/QrMultiframeTxGenerator';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  rootAddress?: string;
  transactions: Transaction[];
  countdown: number;
  signerWallet: Wallet;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (unsigned: UnsignedTransaction[], txPayloads: Uint8Array[]) => void;
};

export const ScanMultiframeQr = ({
  api,
  chainId,
  accounts,
  addressPrefix,
  rootAddress,
  transactions,
  countdown,
  signerWallet,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [encoder, setEncoder] = useState<Encoder>();
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);

  useEffect(() => {
    if (unsignedTransactions.length) return;

    setupTransactions().catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, []);

  const setupTransactions = async (): Promise<void> => {
    const transactionPromises = accounts.map((account, index) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      return (async () => {
        const { payload, unsigned } = await createPayload(transactions[index], api);

        const signPayload = createSubstrateSignPayload(
          signerWallet.signingType === SigningType.POLKADOT_VAULT ? rootAddress! : address,
          payload,
          chainId,
          signerWallet.signingType,
          (account as ShardAccount).derivationPath,
        );

        return {
          unsigned,
          signPayload,
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
    setTxPayloads(txRequests.map((t) => t.signPayload));
    setEncoder(Encoder.with_defaults(bulk, 128));
  };

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mt-10">
        <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransactions}>
          {bulkTxExist && encoder && <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />}
        </QrGeneratorContainer>
      </div>
      <div className="flex w-full justify-between mt-3">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!bulkTxExist || countdown === 0} onClick={() => onResult(unsignedTransactions, txPayloads)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </div>
  );
};
