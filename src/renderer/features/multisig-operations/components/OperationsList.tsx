import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';
import { accountMultisigOperations } from '@/aggregates/account-multisig-operations';
import { operationsContextModel } from '../model/context';
import { list } from '../model/list';

import { EmptyOperations } from './EmptyState/EmptyOperations';
import { Operation } from './Operation';
import { OperationsFilter } from './OperationsFilter';

export const OperationsList = memo(() => {
  const { formatDate } = useI18n();

  const account = useUnit(operationsContextModel.$account);
  const txs = useUnit(accountMultisigOperations.$accountOperations);
  const filteredTxs = useUnit(list.$filteredTxs);
  const groupedTxs = useUnit(list.$groupedTxs);

  const nodes = useMemo(() => {
    return groupedTxs.map(([date, operations]) => (
      <section className="mt-6 w-fit" key={date}>
        <FootnoteText className="mb-3 ml-2 text-text-tertiary">{formatDate(date, 'PP')}</FootnoteText>
        <div className="flex w-[736px] flex-col gap-y-1.5">
          {operations.map(operation => (
            <Operation key={operation.id} operation={operation} />
          ))}
        </div>
      </section>
    ));
  }, [groupedTxs]);

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
