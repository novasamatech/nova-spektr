import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { useEffect } from 'react';

import { type FlexibleMultisigTransactionDS } from '@/shared/api/storage';
import { type MultisigEvent, type MultisigTransactionKey } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { sortByDateDesc } from '@/shared/lib/utils';
import { nullable } from '@/shared/lib/utils/functions';
import { FootnoteText, Header } from '@/shared/ui';
import { operationsModel } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import { accountUtils } from '@/entities/wallet';
import { OperationsFilter } from '@/features/operations';

import EmptyOperations from './components/EmptyState/EmptyOperations';
import { FlexibleMultisigShell } from './components/FlexibleMultisigShell';
import Operation from './components/Operation';
import { operationsContextModel } from './model/context';

export const Operations = () => {
  const { t, formatDate } = useI18n();

  const events = useUnit(operationsModel.$multisigEvents);
  const account = useUnit(operationsContextModel.$account);
  const txs = useUnit(operationsContextModel.$availableTransaction);
  const incompleteFlexibleMultisigTx = useUnit(operationsContextModel.$incompleteFlexibleMultisigTx);
  const filteredTxs = useUnit(operationsModel.$filteredTxs);

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
    let date = tx.dateCreated;

    if (nullable(date)) {
      const events = getEventsByTransaction(tx);
      date = events.at(0)?.dateCreated;
    }

    if (nullable(date)) {
      date = Date.now();
    }

    return formatDate(new Date(date), 'PP');
  });

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  if (incompleteFlexibleMultisigTx && account && accountUtils.isFlexibleMultisigAccount(account)) {
    return (
      <FlexibleMultisigShell tx={incompleteFlexibleMultisigTx as FlexibleMultisigTransactionDS} account={account} />
    );
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <Header title={t('operations.title')} />

      {txs.length > 0 && <OperationsFilter txs={txs} />}

      {filteredTxs.length === 0 && (
        <EmptyOperations multisigAccount={account} isEmptyFromFilters={txs.length !== filteredTxs.length} />
      )}

      {filteredTxs.length > 0 && (
        <div className="mt-4 flex h-full w-full flex-col items-center overflow-y-auto pl-6">
          {Object.entries(groupedTxs)
            .sort(sortByDateDesc)
            .map(([date, txs]) => (
              <section className="mt-6 w-fit" key={date}>
                <FootnoteText className="mb-3 ml-2 text-text-tertiary">{date}</FootnoteText>
                <ul className="flex w-[736px] flex-col gap-y-1.5">
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
    </div>
  );
};
