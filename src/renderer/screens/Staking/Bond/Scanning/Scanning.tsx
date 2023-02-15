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
import { Block, Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from '@renderer/screens/Signing/common/consts';
import { AccountDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { formatAddress } from '@renderer/shared/utils/address';
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';
import { secondsToMinutes } from '@renderer/shared/utils/time';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: AccountDS[];
  addressPrefix: number;
  transactions: Transaction[];
  onResult: (unsigned: UnsignedTransaction[]) => void;
};

const Scanning = ({ api, chainId, accounts, addressPrefix, transactions, onResult }: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);
  const [encoder, setEncoder] = useState<Encoder>();
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const setupTransactions = async () => {
    const transactionPromises = accounts.map((account, index) => {
      const address = formatAddress(account.accountId, addressPrefix);

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <div className="overflow-y-auto">
      <section className="flex flex-col items-center mx-auto w-[500px] rounded-2lg bg-shade-2 p-5">
        <Block className="flex flex-col items-center gap-y-2.5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          {bulkTxExist && encoder ? (
            <div className="w-[220px] h-[220px]">
              <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />
              {/*<QrTxGenerator cmd={0} payload={txPayload} address={currentAddress} genesisHash={chainId} />*/}
            </div>
          ) : (
            <div className="w-[220px] h-[220px] rounded-2lg bg-shade-20 animate-pulse" />
          )}
          {bulkTxExist && (
            <div className="flex items-center uppercase font-normal text-xs gap-1.25">
              {t('signing.qrCountdownTitle')}
              <div
                className={cn(
                  'rounded-md text-white py-0.5 px-1.5',
                  countdown > 60 ? 'bg-success' : countdown > 0 ? 'bg-alert' : 'bg-error',
                )}
              >
                {secondsToMinutes(countdown)}
              </div>
            </div>
          )}
        </Block>
        <div className="flex flex-col items-center gap-y-1 text-xs font-semibold text-primary mt-2.5 mb-5">
          <a className="flex items-center" href={TROUBLESHOOTING_URL} rel="noopener noreferrer" target="_blank">
            <Icon className="mr-1" name="globe" size={18} /> {t('signing.troubleshootingLink')}
          </a>
          <a
            className="flex items-center"
            href={getMetadataPortalUrl(chainId)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon className="mr-1" name="globe" size={18} /> {t('signing.metadataPortalLink')}
          </a>
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
      </section>
    </div>
  );
};

export default Scanning;
