import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { memo, useEffect, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { sortByDateDesc } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';
import { priceProviderModel } from '@/entities/price';
import { accountMultisigOperations } from '@/aggregates/account-multisig-operations';
import { operationsContextModel } from '../model/context';
import { list } from '../model/list';

import EmptyOperations from './EmptyState/EmptyOperations';
import { FlexibleMultisigShell } from './FlexibleMultisigShell';
import Operation from './Operation';
import { OperationsFilter } from './OperationsFilter';

export const Operations = memo(() => {
  const { formatDate } = useI18n();

  const account = useUnit(operationsContextModel.$account);
  const txs = useUnit(accountMultisigOperations.$accountOperations);
  const incompleteFlexibleMultisigTx = useUnit(operationsContextModel.$incompleteFlexibleMultisigTx);
  const filteredTxs = useUnit(list.$filteredTxs);

  const groupedTxs = useMemo(() => {
    const sortedTxs = Array.from(filteredTxs).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
    const groups = groupBy(sortedTxs, tx => formatDate(tx.timestamp || Date.now(), 'PP'));
    return Object.entries(groups).sort(sortByDateDesc);
  }, [filteredTxs]);

  const nodes = useMemo(() => {
    return groupedTxs.map(([date, operations]) => (
      <section className="mt-6 w-fit" key={date}>
        <FootnoteText className="mb-3 ml-2 text-text-tertiary">{date}</FootnoteText>
        <ul className="flex w-[736px] flex-col gap-y-1.5">
          {operations.map(operation => (
            <li key={operation.timestamp}>
              <Operation operation={operation} />
            </li>
          ))}
        </ul>
      </section>
    ));
  }, [groupedTxs]);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  if (incompleteFlexibleMultisigTx && account) {
    return <FlexibleMultisigShell operation={incompleteFlexibleMultisigTx} account={account} />;
  }

  return (
    <>
      {txs.length > 0 && <OperationsFilter txs={txs} />}

      {filteredTxs.length === 0 && (
        <EmptyOperations multisigAccount={account} isEmptyFromFilters={txs.length !== filteredTxs.length} />
      )}

      {filteredTxs.length > 0 && (
        <div className="h-full min-h-0 w-full">
          <ScrollArea>
            <div className="flex min-h-0 flex-col items-center py-4 pl-6">{nodes}</div>
          </ScrollArea>
        </div>
      )}
    </>
  );
});
