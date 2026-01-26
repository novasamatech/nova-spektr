import { useUnit } from 'effector-react';
import { groupBy } from 'lodash';
import { useEffect, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useScrollTo } from '@/shared/lib/hooks';
import { sortByDateDesc } from '@/shared/lib/utils';
import { nullable } from '@/shared/lib/utils/functions';
import { FootnoteText, Loader } from '@/shared/ui';
import { Box, ScrollArea } from '@/shared/ui-kit';
import { multisigOperation } from '@/domains/network';
import { operationsContextModel } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

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
  const operations = useUnit(multisigOperation.$list);
  const filteredTxs = useUnit(operationsContextModel.$filteredOperations);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
  const isDeepLinkLoading = useUnit(deepLinkModel.$isDeepLinkLoading);
  const isTabDataLoading = useUnit(operationsContextModel.$isTabDataLoading);

  const hasMultisigAccounts = multisigAccountsMap.size > 0;

  const [focusedRef, scrollToFocused] = useScrollTo<HTMLLIElement>(300);

  const groupedTxs = useMemo(() => {
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

    // Sort transactions within each group by timestamp
    for (const date of Object.keys(groupedTxs)) {
      groupedTxs[date] = groupedTxs[date].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    return groupedTxs;
  }, [filteredTxs, formatDate]);

  const sortedTxs = useMemo(() => {
    return Object.entries(groupedTxs).toSorted(sortByDateDesc);
  }, [groupedTxs]);

  useEffect(() => {
    return () => deepLinkModel.operationsPageClosed();
  }, []);

  // Scroll to focused operation
  useEffect(() => {
    if (focusedOperationId && focusedRef.current) {
      scrollToFocused();
    }
  }, [focusedOperationId, focusedRef.current, scrollToFocused]);

  return (
    <>
      {!hasMultisigAccounts && <EmptyOperations hasMultisigAccounts={false} isEmptyFromFilters={false} />}

      {hasMultisigAccounts && (
        <ScrollArea>
          <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
            {(isTabDataLoading || isDeepLinkLoading) && (
              <div className="mt-4 flex w-full justify-center">
                <Loader color="primary" size={25} />
              </div>
            )}

            {!isTabDataLoading && filteredTxs.length === 0 && (
              <EmptyOperations
                hasMultisigAccounts={hasMultisigAccounts}
                isEmptyFromFilters={operations.length !== filteredTxs.length}
              />
            )}

            {filteredTxs.length > 0 && (
              <div className="flex h-full w-full flex-col items-center overflow-y-auto">
                {sortedTxs.map(([date, txs]) => (
                  <section className="mb-8 w-full" key={date}>
                    <FootnoteText className="mb-3 ml-2 text-text-tertiary">{date}</FootnoteText>
                    <ul className="flex w-full flex-col gap-y-1.5">
                      {txs.map(tx => {
                        const multisigAccount = multisigAccountsMap.get(tx.accountId);
                        if (!multisigAccount) return null;

                        return (
                          <li key={tx.id} ref={tx.id === focusedOperationId ? focusedRef : undefined}>
                            <Operation
                              key={`${tx.id}-${tx.id === focusedOperationId}`}
                              operation={tx}
                              multisigAccount={multisigAccount}
                              isDefaultOpen={tx.id === focusedOperationId}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
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
