import { useEffect, useState } from 'react';
import { groupBy } from 'lodash';
import { format } from 'date-fns';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import Operation from './components/Operation';
import { sortByDateDesc } from './common/utils';
import { FootnoteText } from '@shared/ui';
import { MultisigTransactionDS } from '@shared/api/storage';
import { useMultisigTx, useMultisigEvent } from '@entities/multisig';
import { Header } from '@renderer/components/common';
import { MultisigEvent, MultisigTransactionKey } from '@entities/transaction';
import { OperationsFilter } from '@features/operation';
import { walletModel, accountUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { networkModel } from '@entities/network';

export const Operations = () => {
  const { t, dateLocale } = useI18n();
  const activeAccounts = useUnit(walletModel.$activeAccounts);
  const chains = useUnit(networkModel.$chains);

  const { getLiveAccountMultisigTxs } = useMultisigTx({});
  const { getLiveEventsByKeys } = useMultisigEvent({});

  const activeAccount = activeAccounts.at(0);
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

    return format(new Date(date), 'PP', { locale: dateLocale });
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
