import { useUnit } from 'effector-react';
import { groupBy } from 'lodash';

import { useI18n } from '@/shared/i18n';
import { sortByDateDesc } from '@/shared/lib/utils';
import { nullable } from '@/shared/lib/utils/functions';
import { FootnoteText } from '@/shared/ui';
import { Box, ScrollArea } from '@/shared/ui-kit';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { operationsContextModel } from '../model/context';

import { EmptyOperations } from './EmptyOperations';
import { Operation } from './Operation';
import { OperationsFilter } from './OperationsFilter';

export const Operations = () => {
  const { formatDate } = useI18n();

  const anyMultisigAccount = useUnit(operationsContextModel.$anyMultisigAccount);
  const operations = useUnit(selectedWalletMultisigOperations.$list);
  const filteredTxs = useUnit(operationsContextModel.$filteredOperations);

  const groupedTxs = groupBy(filteredTxs, tx => {
    let date: number | undefined = tx.timestamp;

    if (nullable(date)) {
      date = tx.events.at(0)?.timestamp;
    }

    if (nullable(date)) {
      date = Date.now();
    }

    return formatDate(new Date(date), 'PP');
  });

  if (!anyMultisigAccount) {
    return <EmptyOperations anyMultisigAccount={null} isEmptyFromFilters={false} />;
  }

  return (
    <ScrollArea>
      <Box horizontalAlign="center" padding={[0, 0, 10]}>
        {operations.length > 0 && <OperationsFilter operations={operations} />}

        {filteredTxs.length === 0 && (
          <EmptyOperations
            anyMultisigAccount={anyMultisigAccount}
            isEmptyFromFilters={operations.length !== filteredTxs.length}
          />
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
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                      .map(tx => (
                        <li key={tx.id}>
                          <Operation operation={tx} anyMultisigAccount={anyMultisigAccount} />
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </Box>
    </ScrollArea>
  );
};
