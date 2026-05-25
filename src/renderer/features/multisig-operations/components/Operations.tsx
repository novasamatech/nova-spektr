import { useVirtualizer } from '@tanstack/react-virtual';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { groupByDate } from '@/shared/lib/utils';
import { FootnoteText, Loader } from '@/shared/ui';
import { AsyncItem, Box, ScrollArea } from '@/shared/ui-kit';
import { useOperationDescriptionsFetch } from '@/domains/backend';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { DraftsSection } from '@/features/drafts';
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
  const multisigAccounts = useUnit(operationsContextModel.$multisigAccounts);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const filteredOps = useUnit(operationsContextModel.$filteredOperations);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
  const isDeepLinkLoading = useUnit(deepLinkModel.$isDeepLinkLoading);
  const isTabDataLoading = useUnit(operationsContextModel.$isTabDataLoading);
  const tab = useUnit(operationsContextModel.$tab);
  const baseUrl = useUnit(backendConfigurationModel.$backendUrl);
  const hasEverConnected = useUnit(connectionHistoryModel.$hasEverConnected);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);

  const operationIds = useMemo(() => filteredOps.map(({ operation }) => operation.id), [filteredOps]);

  useOperationDescriptionsFetch(isAuthenticated ? baseUrl : null, operationIds);

  const hasMultisigAccounts = multisigAccounts.length > 0;

  // Virtualization already limits rendering to visible items + overscan,
  // so useDeferredList (which defers via useDeferredValue) only adds latency.
  const isDeferredLoading = isTabDataLoading;
  const deferredOps = filteredOps;

  const sortedOps = useMemo(
    () => groupByDate(deferredOps, ({ operation }) => multisigOperationService.getOperationTimestamp(operation)),
    [deferredOps],
  );

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    for (const group of sortedOps) {
      items.push({ type: 'header', date: formatDate(group.dateStart, 'PP') });
      for (const item of group.items) {
        items.push({ type: 'operation', item });
      }
    }

    return items;
  }, [sortedOps, formatDate]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: index => (flatItems[index]?.type === 'header' ? 44 : 74),
    overscan: 15,
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
          {tab === 'pending' && hasEverConnected && <DraftsSection />}

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
                        <AsyncItem fallback={<div className="h-[68px] rounded bg-block-background-default" />}>
                          <Operation
                            key={
                              item.item.operation.id === focusedOperationId
                                ? `focused-${item.item.operation.id}`
                                : item.item.operation.id
                            }
                            operation={item.item.operation}
                            multisigAccount={item.item.account}
                            isDefaultOpen={item.item.operation.id === focusedOperationId}
                            tab={tab}
                            chains={chains}
                            wallets={wallets}
                          />
                        </AsyncItem>
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
