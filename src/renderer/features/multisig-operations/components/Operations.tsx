import { useVirtualizer } from '@tanstack/react-virtual';
import { useUnit } from 'effector-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CountChip, FootnoteText, Icon, Loader } from '@/shared/ui';
import { ROW_GAP, ROW_HEIGHT, SECTION_HEADER_HEIGHT, getOperationsMinWidth } from '@/shared/ui/operations-table-layout';
import { AsyncItem, Box, ScrollArea } from '@/shared/ui-kit';
import { useOperationDescriptionsFetch } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import {
  useIsInitiatorColumnVisible,
  useIsResizingColumns,
  useOperationColumnWidths,
} from '@/aggregates/operations-table-layout';
import { DraftsSection } from '@/features/drafts';
import { type OperationSection, SECTION_LABEL_KEYS } from '../lib/operations-sections';
import { type OperationWithAccount, operationsContextModel } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

import { ChainSyncStatus } from './ChainSyncStatus';
import { EmptyOperations } from './EmptyOperations';
import { Operation } from './Operation';
import { OperationsTableHeader } from './OperationsTableHeader';
import { AccountNotFoundModal } from './modals/AccountNotFoundModal';
import { AlreadySignedModal } from './modals/AlreadySignedModal';
import { ConnectionTimeoutModal } from './modals/ConnectionTimeoutModal';
import { NetworkNotAvailableModal } from './modals/NetworkNotAvailableModal';
import { OperationNotFoundModal } from './modals/OperationNotFoundModal';

type FlatItem =
  | { type: 'section'; section: OperationSection; count: number }
  | { type: 'operation'; item: OperationWithAccount };

const isSectionItem = (item: FlatItem): item is FlatItem & { type: 'section' } => item.type === 'section';

export const Operations = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const multisigAccounts = useUnit(operationsContextModel.$multisigAccounts);
  const filter = useUnit(operationsContextModel.$filter);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const filteredOps = useUnit(operationsContextModel.$filteredOperations);
  const sectionedOps = useUnit(operationsContextModel.$sectionedOperations);
  const collapsedSections = useUnit(operationsContextModel.$collapsedSections);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
  const isDeepLinkLoading = useUnit(deepLinkModel.$isDeepLinkLoading);
  const isTabDataLoading = useUnit(operationsContextModel.$isTabDataLoading);
  const tab = useUnit(operationsContextModel.$tab);
  const baseUrl = useUnit(backendConfigurationModel.$backendUrl);
  const hasEverConnected = useUnit(connectionHistoryModel.$hasEverConnected);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const widths = useOperationColumnWidths();
  const isResizing = useIsResizingColumns();
  const showInitiator = useIsInitiatorColumnVisible();

  const operationIds = useMemo(() => filteredOps.map(({ operation }) => operation.id), [filteredOps]);

  useOperationDescriptionsFetch(isAuthenticated ? baseUrl : null, operationIds);

  const hasMultisigAccounts = multisigAccounts.length > 0;

  // Virtualization already limits rendering to visible items + overscan,
  // so useDeferredList (which defers via useDeferredValue) only adds latency.
  const isDeferredLoading = isTabDataLoading;
  const deferredOps = filteredOps;
  // Drafts obey the Status filter like any other section: visible when no
  // status is selected or when `drafts` is among the selected statuses.
  const matchesStatusFilter = filter.status.length === 0 || filter.status.includes('drafts');
  const showDrafts = tab === 'pending' && hasEverConnected && matchesStatusFilter;

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    for (const { section, items: sectionItems } of sectionedOps) {
      items.push({ type: 'section', section, count: sectionItems.length });
      if (collapsedSections[section]) continue;

      for (const item of sectionItems) {
        items.push({ type: 'operation', item });
      }
    }

    return items;
  }, [sectionedOps, collapsedSections]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const aboveListRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Keep scrollMargin in sync with the container's offset from the scroll root.
  // DraftsSection and the table header above the list have variable height; without this the
  // virtualizer computes scroll offsets relative to the wrong origin and items disappear on scroll.
  useLayoutEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const newMargin = el.offsetTop;
    setScrollMargin(prev => (prev === newMargin ? prev : newMargin));
  });

  // DraftsSection mutates its own height from local state (collapse toggle,
  // expandable draft rows) without re-rendering Operations, so the effect above
  // never fires for it — observe the content above the list to keep
  // scrollMargin following those changes.
  useLayoutEffect(() => {
    const above = aboveListRef.current;
    if (!above) return;

    const observer = new ResizeObserver(() => {
      const el = listContainerRef.current;
      if (!el) return;
      setScrollMargin(prev => (prev === el.offsetTop ? prev : el.offsetTop));
    });
    observer.observe(above);

    return () => observer.disconnect();
  }, [hasMultisigAccounts]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: index => (flatItems[index]?.type === 'section' ? SECTION_HEADER_HEIGHT : ROW_HEIGHT + ROW_GAP),
    overscan: 15,
    scrollMargin,
    getItemKey: index => {
      const item = flatItems[index];
      if (!item) return `unknown-${index}`;

      return isSectionItem(item) ? `section-${item.section}` : item.item.operation.id;
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
        <div className="h-full overflow-x-auto overflow-y-hidden">
          <div
            className={cnTw('group/list h-full', isResizing && 'select-none')}
            data-resizing={isResizing || undefined}
            style={
              deferredOps.length > 0 || showDrafts
                ? { minWidth: getOperationsMinWidth(widths, { showInitiator }) }
                : undefined
            }
          >
            <ScrollArea viewportRef={scrollRef}>
              <div ref={aboveListRef}>
                {(deferredOps.length > 0 || showDrafts) && <OperationsTableHeader />}

                {showDrafts && <DraftsSection scope={filter} />}

                {(isDeferredLoading || isDeepLinkLoading) && (
                  <div className="mt-4 flex w-full items-center justify-center gap-x-3">
                    <Loader color="primary" size={25} />
                    <ChainSyncStatus />
                  </div>
                )}
              </div>

              {!isDeferredLoading && deferredOps.length === 0 && (
                <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
                  <EmptyOperations isEmptyFromFilters={isFiltersSelected} tab={tab} />
                </Box>
              )}

              {deferredOps.length > 0 && (
                <div
                  ref={listContainerRef}
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
                          transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                        }}
                      >
                        {isSectionItem(item) ? (
                          <button
                            type="button"
                            aria-expanded={!collapsedSections[item.section]}
                            className={cnTw(
                              'flex items-center gap-2 rounded-sm px-2 pt-4 pb-1.5',
                              'focus-visible:outline-2 focus-visible:outline-icon-accent',
                            )}
                            onClick={() => operationsContextModel.toggleSection(item.section)}
                          >
                            <Icon
                              name="shelfDown"
                              size={15}
                              className={cnTw(
                                'text-icon-default transition-transform',
                                collapsedSections[item.section] ? 'rotate-0' : 'rotate-180',
                              )}
                            />
                            <FootnoteText className="font-semibold text-text-primary">
                              {t(SECTION_LABEL_KEYS[item.section])}
                            </FootnoteText>
                            <CountChip count={item.count} />
                          </button>
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
          </div>
        </div>
      )}

      <AccountNotFoundModal />
      <NetworkNotAvailableModal />
      <ConnectionTimeoutModal />
      <OperationNotFoundModal />
      <AlreadySignedModal />
    </>
  );
};
