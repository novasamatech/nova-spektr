import { useVirtualizer } from '@tanstack/react-virtual';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { groupBy } from '@/shared/lib/utils';
import { nullable } from '@/shared/lib/utils/functions';
import { FootnoteText, Loader } from '@/shared/ui';
import { Box, ScrollArea } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type OperationWithAccount, operationsContextModel } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

import { ChainSyncStatus } from './ChainSyncStatus';
import { EmptyOperations } from './EmptyOperations';
import { Operation } from './Operation';
import { AccountNotFoundModal } from './modals/AccountNotFoundModal';
import { AlreadySignedModal } from './modals/AlreadySignedModal';
import { ConnectionTimeoutModal } from './modals/ConnectionTimeoutModal';
import { NetworkNotAvailableModal } from './modals/NetworkNotAvailableModal';
import { OperationNotFoundModal } from './modals/OperationNotFoundModal';

type FlatItem = { type: 'header'; date: string } | { type: 'operation'; item: OperationWithAccount };

const isHeaderItem = (item: FlatItem): item is FlatItem & { type: 'header' } => item.type === 'header';

export const Operations = () => {
  const { formatDate } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const multisigAccountsMap = useUnit(operationsContextModel.$multisigAccountsMap);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const filteredOps = useUnit(operationsContextModel.$filteredOperations);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
  const isDeepLinkLoading = useUnit(deepLinkModel.$isDeepLinkLoading);
  const isTabDataLoading = useUnit(operationsContextModel.$isTabDataLoading);
  const tab = useUnit(operationsContextModel.$tab);

  const hasMultisigAccounts = Object.keys(multisigAccountsMap).length > 0;

  const { list: deferredOps, isLoading: isDeferredLoading } = useDeferredList({
    list: filteredOps,
    isLoading: isTabDataLoading,
  });

  const sortedOps = useMemo(() => {
    const getDateKey = ({ operation }: OperationWithAccount): string => {
      let date: number | undefined = operation.timestamp;

      if (nullable(date)) {
        date = operation.events.at(0)?.timestamp;
      }

      if (nullable(date)) {
        date = Date.now();
      }

      const d = new Date(date);

      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const grouped = groupBy(deferredOps, getDateKey);

    return Object.entries(grouped)
      .toSorted(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([isoDate, items]) => {
        const sorted = items!.toSorted((a, b) => (b.operation.timestamp || 0) - (a.operation.timestamp || 0));
        const [y, m, d] = isoDate.split('-').map(Number);
        const displayDate = formatDate(new Date(y ?? 0, (m ?? 1) - 1, d), 'PP');

        return [displayDate, sorted] as const;
      });
  }, [deferredOps, formatDate]);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    for (const [date, ops] of sortedOps) {
      items.push({ type: 'header', date });
      for (const item of ops) {
        items.push({ type: 'operation', item });
      }
    }

    return items;
  }, [sortedOps]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: index => (flatItems[index]?.type === 'header' ? 44 : 74),
    overscan: 5,
    getItemKey: index => {
      const item = flatItems[index];
      if (!item) return `unknown-${index}`;

      return isHeaderItem(item) ? `header-${item.date}` : item.item.operation.id;
    },
  });

  const focusedIndex = useMemo(() => {
    if (!focusedOperationId) return -1;

    return flatItems.findIndex(item => item.type === 'operation' && item.item.operation.id === focusedOperationId);
  }, [flatItems, focusedOperationId]);

  useEffect(() => {
    return () => deepLinkModel.operationsPageClosed();
  }, []);

  useEffect(() => {
    if (focusedIndex >= 0) {
      virtualizer.scrollToIndex(focusedIndex, { align: 'center' });
    }
  }, [focusedIndex]);

  return (
    <>
      {!hasMultisigAccounts && (
        <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
          <EmptyOperations isEmptyFromFilters={false} tab={tab} />
        </Box>
      )}

      {hasMultisigAccounts && (
        <ScrollArea viewportRef={scrollRef}>
          {(isDeferredLoading || isDeepLinkLoading) && (
            <div className="mt-4 flex w-full items-center justify-center gap-x-3">
              <Loader color="primary" size={25} />
              <ChainSyncStatus />
            </div>
          )}

          {!isDeferredLoading && deferredOps.length === 0 && (
            <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
              <EmptyOperations isEmptyFromFilters={isFiltersSelected} tab={tab} />
            </Box>
          )}

          {deferredOps.length > 0 && (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const item = flatItems[virtualRow.index];
                if (!item) return null;

                return (
                  <div
                    key={virtualRow.key}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {isHeaderItem(item) ? (
                      <div className={virtualRow.index > 0 ? 'pt-8 pb-3 pl-2' : 'pb-3 pl-2'}>
                        <FootnoteText className="text-text-tertiary">{item.date}</FootnoteText>
                      </div>
                    ) : (
                      <div className="pb-1.5">
                        <Operation
                          operation={item.item.operation}
                          multisigAccount={item.item.account}
                          isDefaultOpen={item.item.operation.id === focusedOperationId}
                          tab={tab}
                          chains={chains}
                          wallets={wallets}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
