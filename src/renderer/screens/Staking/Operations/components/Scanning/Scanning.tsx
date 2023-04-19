import { ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import cn from 'classnames';
import init, { Encoder } from 'raptorq';
import { useEffect, useState } from 'react';

import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import {
  createMultipleSignPayload,
  createSignPayload,
} from '@renderer/components/common/QrCode/QrGenerator/common/utils';
import QrMultiframeGenerator from '@renderer/components/common/QrCode/QrGenerator/QrMultiframeTxGenerator';
import { TRANSACTION_BULK } from '@renderer/components/common/QrCode/QrReader/common/constants';
import { Block, Button, InfoLink, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { ChainID } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from '@renderer/screens/Signing/common/consts';
import { AccountDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { toAddress } from '@renderer/shared/utils/address';
import { secondsToMinutes } from '@renderer/shared/utils/time';

type Props = {
  api: ApiPromise;
  chainId: ChainID;
  accounts: AccountDS[];
  addressPrefix: number;
  transactions: Transaction[];
  countdown?: number;
  onResetCountdown: () => void;
  onResult: (unsigned: UnsignedTransaction[]) => void;
};

export const Scanning = ({
  api,
  chainId,
  accounts,
  addressPrefix,
  transactions,
  countdown = 0,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [encoder, setEncoder] = useState<Encoder>();
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const setupTransactions = async () => {
    const transactionPromises = accounts.map((account, index) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      return (async () => {
        const { payload, unsigned } = await createPayload(transactions[index], api);

        return {
          signPayload: createSignPayload(address, Command.Transaction, payload, chainId),
          unsigned,
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

  useEffect(() => {
    setupTransactions();
  }, []);

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <div className="overflow-y-auto flex-1">
      <Plate as="section" className="flex flex-col items-center mx-auto w-[500px]">
        <Block className="flex flex-col items-center gap-y-2.5 p-5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          {!bulkTransactions && <div className="w-[220px] h-[220px] rounded-2lg bg-shade-20 animate-pulse" />}

          {bulkTxExist && encoder && (
            <div className="w-[220px] h-[220px]">
              <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />
            </div>
          )}
          {bulkTxExist && (
            <div className="flex items-center uppercase font-normal text-xs gap-1.25">
              {t('signing.qrCountdownTitle')}
              <div
                className={cn(
                  'w-10 rounded-md text-white py-0.5 text-center',
                  (!countdown && 'bg-error') || (countdown >= 60 ? 'bg-success' : 'bg-alert'),
                )}
              >
                {secondsToMinutes(countdown)}
              </div>
            </div>
          )}
        </Block>
        <div className="flex flex-col items-center gap-y-1 text-xs font-semibold text-primary mt-2.5 mb-5">
          <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>
          <InfoLink url={getMetadataPortalUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
        </div>

        {bulkTxExist && countdown > 0 ? (
          <Button
            className="w-fit mx-auto"
            variant="fill"
            pallet="primary"
            weight="lg"
            onClick={() => onResult(unsignedTransactions)}
          >
            {t('signing.continueButton')}
          </Button>
        ) : (
          <Button variant="fill" pallet="primary" weight="lg" onClick={setupTransactions}>
            {t('signing.generateNewQrButton')}
          </Button>
        )}
      </Plate>
    </div>
  );
};
