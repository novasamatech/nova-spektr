import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type MultisigTransactionDS } from '@shared/api/storage';
import { type MultisigEvent, type MultisigTransactionKey } from '@shared/core';
import { sortByDateDesc } from '@shared/lib/utils';
import { FootnoteText, Header } from '@shared/ui';
import { useMultisigEvent, useMultisigTx } from '@entities/multisig';
import { networkModel } from '@entities/network';
import { priceProviderModel } from '@entities/price';
import { accountUtils, walletModel } from '@entities/wallet';
import { OperationsFilter } from '@features/operations';

import EmptyOperations from './components/EmptyState/EmptyOperations';
import Operation from './components/Operation';

export const Operations = () => {
  const { t, formatDate } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);

  const { getLiveAccountMultisigTxs } = useMultisigTx({});
  const { getLiveEventsByKeys } = useMultisigEvent({});

  const activeAccount = activeWallet?.accounts.at(0);
  const account = activeAccount && accountUtils.isMultisigAccount(activeAccount) ? activeAccount : undefined;

  const allTxs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);

  const [txs, setTxs] = useState<MultisigTransactionDS[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<MultisigTransactionDS[]>([]);

  const events = getLiveEventsByKeys(txs.filter((tx) => !tx.dateCreated));

  const getEventsByTransaction = (tx: MultisigTransactionKey): MultisigEvent[] => {
    return events.filter((e) => {
      return (
        e.txAccountId === tx.accountId &&
        e.txChainId === tx.chainId &&
        e.txCallHash === tx.callHash &&
        e.txBlock === tx.blockCreated &&
        e.txIndex === tx.indexCreated
      );
    });
  };

  const groupedTxs = groupBy(filteredTxs, (tx) => {
    const date = tx.dateCreated || getEventsByTransaction(tx)[0]?.dateCreated || Date.now();

    return formatDate(new Date(date), 'PP');
  });

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    setTxs(allTxs.filter((tx) => chains[tx.chainId]));
  }, [allTxs.length]);

  useEffect(() => {
    setFilteredTxs([]);
  }, [activeAccount]);

  return (
    <div className="flex flex-col items-center relative h-full">
      <Header title={t('operations.title')} />

      {Boolean(txs.length) && <OperationsFilter txs={txs} onChange={setFilteredTxs} />}

      {Boolean(filteredTxs.length) && (
        <div className="pl-6 overflow-y-auto w-full mt-4 h-full flex flex-col items-center">
          {Object.entries(groupedTxs)
            .sort(sortByDateDesc)
            .map(([date, txs]) => (
              <section className="w-fit mt-6" key={date}>
                <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
                <ul className="flex flex-col gap-y-1.5 w-[736px]">
                  {txs
                    .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                    .map((tx) => (
                      <li key={tx.dateCreated}>
                        <Operation tx={tx} account={account} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {filteredTxs.length === 0 && (
        <EmptyOperations multisigAccount={account} isEmptyFromFilters={txs.length !== filteredTxs.length} />
      )}
    </div>
  );
};
