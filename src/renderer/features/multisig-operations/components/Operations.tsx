import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useScrollTo } from '@/shared/lib/hooks';
import { groupBy } from '@/shared/lib/utils';
import { nullable } from '@/shared/lib/utils/functions';
import { FootnoteText, Loader } from '@/shared/ui';
import { AsyncItem, Box, ScrollArea } from '@/shared/ui-kit';
import { operationsContextModel } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

import { ChainSyncStatus } from './ChainSyncStatus';
import { EmptyOperations } from './EmptyOperations';
import { Operation } from './Operation';
import { AccountNotFoundModal } from './modals/AccountNotFoundModal';
import { AlreadySignedModal } from './modals/AlreadySignedModal';
import { ConnectionTimeoutModal } from './modals/ConnectionTimeoutModal';
import { NetworkNotAvailableModal } from './modals/NetworkNotAvailableModal';
import { OperationNotFoundModal } from './modals/OperationNotFoundModal';

export const Operations = () => {
  const { formatDate } = useI18n();

  const multisigAccountsMap = useUnit(operationsContextModel.$multisigAccountsMap);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const filteredTxs = useUnit(operationsContextModel.$filteredOperations);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
  const isDeepLinkLoading = useUnit(deepLinkModel.$isDeepLinkLoading);
  const isTabDataLoading = useUnit(operationsContextModel.$isTabDataLoading);
  const tab = useUnit(operationsContextModel.$tab);

  const hasMultisigAccounts = Object.keys(multisigAccountsMap).length > 0;

  const [focusedRef, scrollToFocused] = useScrollTo<HTMLLIElement>(300);

  const sortedTxs = useMemo(() => {
    const getDateKey = (tx: (typeof filteredTxs)[number]): string => {
      let date: number | undefined = tx.timestamp;

      if (nullable(date)) {
        date = tx.events.at(0)?.timestamp;
      }

      if (nullable(date)) {
        date = Date.now();
      }

      const d = new Date(date);

      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const txsWithAccounts = filteredTxs.filter(tx => multisigAccountsMap[tx.accountId]);
    const grouped = groupBy(txsWithAccounts, getDateKey);

    return Object.entries(grouped)
      .toSorted(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([isoDate, txs]) => {
        const sortedTxs = txs!.toSorted((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const [y, m, d] = isoDate.split('-').map(Number);
        const displayDate = formatDate(new Date(y, m - 1, d), 'PP');

        return [displayDate, sortedTxs] as const;
      });
  }, [filteredTxs, formatDate, multisigAccountsMap]);

  useEffect(() => {
    return () => deepLinkModel.operationsPageClosed();
  }, []);

  useEffect(() => {
    if (focusedOperationId && focusedRef.current) {
      scrollToFocused();
    }
  }, [focusedOperationId, focusedRef.current, scrollToFocused]);

  return (
    <>
      {!hasMultisigAccounts && (
        <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
          <EmptyOperations isEmptyFromFilters={false} tab={tab} />
        </Box>
      )}

      {hasMultisigAccounts && (
        <ScrollArea>
          <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
            {(isTabDataLoading || isDeepLinkLoading) && (
              <div className="mt-4 flex w-full items-center justify-center gap-x-3">
                <Loader color="primary" size={25} />
                <ChainSyncStatus />
              </div>
            )}

            {!isTabDataLoading && filteredTxs.length === 0 && (
              <EmptyOperations isEmptyFromFilters={isFiltersSelected} tab={tab} />
            )}

            {filteredTxs.length > 0 && (
              <div className="flex h-full w-full flex-col items-center overflow-y-auto">
                {sortedTxs.map(([date, txs], index) => {
                  const strategy = index === 0 ? ('sync' as const) : ('idle' as const);

                  return (
                    <AsyncItem strategy={strategy} key={date}>
                      <section className="mb-8 w-full">
                        <FootnoteText className="mb-3 ml-2 text-text-tertiary">{date}</FootnoteText>
                        <ul className="flex w-full flex-col gap-y-1.5">
                          {txs.map(tx => {
                            const multisigAccount = multisigAccountsMap[tx.accountId];
                            if (!multisigAccount) return null;

                            return (
                              <li key={tx.id} ref={tx.id === focusedOperationId ? focusedRef : undefined}>
                                <Operation
                                  key={`${tx.id}-${tx.id === focusedOperationId}`}
                                  operation={tx}
                                  multisigAccount={multisigAccount}
                                  isDefaultOpen={tx.id === focusedOperationId}
                                  tab={tab}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    </AsyncItem>
                  );
                })}
              </div>
            )}
          </Box>
        </ScrollArea>
      )}

      <AccountNotFoundModal />
      <NetworkNotAvailableModal />
      <ConnectionTimeoutModal />
      <OperationNotFoundModal />
      <AlreadySignedModal />
    </>
  );
};
