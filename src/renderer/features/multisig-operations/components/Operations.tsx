import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { sortByDateDesc } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { priceProviderModel } from '@/entities/price';
import { OperationsFilter } from '@/features/operations';
import { operationsContextModel } from '../model/context';
import { operations } from '../model/model';

import EmptyOperations from './EmptyState/EmptyOperations';
import { FlexibleMultisigShell } from './FlexibleMultisigShell';
import Operation from './Operation';

export const Operations = () => {
  const { formatDate } = useI18n();

  const account = useUnit(operationsContextModel.$account);
  const txs = useUnit(operations.$availableOperations);
  const incompleteFlexibleMultisigTx = useUnit(operationsContextModel.$incompleteFlexibleMultisigTx);
  const filteredTxs = useUnit(operations.$filteredTxs);

  const groupedTxs = groupBy(filteredTxs, tx => {
    const timestamp = tx.timestamp || Date.now();

    return formatDate(timestamp, 'PP');
  });

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  if (incompleteFlexibleMultisigTx && account) {
    return <FlexibleMultisigShell tx={incompleteFlexibleMultisigTx} account={account} />;
  }

  return (
    <>
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
                    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0))
                    .map(tx => (
                      <li key={tx.timestamp}>
                        <Operation tx={tx} account={account} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </>
  );
};
