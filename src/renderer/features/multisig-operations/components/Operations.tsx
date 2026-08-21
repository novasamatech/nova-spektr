import { useVirtualizer } from '@tanstack/react-virtual';
import { useUnit } from 'effector-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import {
  EMPTY_SECTION_HEIGHT,
  ROW_GAP,
  ROW_HEIGHT,
  SECTION_HEADER_HEIGHT,
  getOperationsMinWidth,
} from '@/shared/ui/operations-table-layout';
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
import { DraftsSection, useDraftsSectionState } from '@/features/drafts';
import { buildFlatItems } from '../lib/build-flat-items';
import { SECTION_EMPTY_LABEL_KEYS, SECTION_LABEL_KEYS } from '../lib/operations-sections';
import { operationsContextModel } from '../model/context';
import { deepLinkModel } from '../model/deep-link';

import { useChainSyncToast } from './ChainSyncToast';
import { EmptyOperations } from './EmptyOperations';
import { Operation } from './Operation';
import { OperationsTableHeader } from './OperationsTableHeader';
import { SectionHeading } from './SectionHeading';
import { AccountNotFoundModal } from './modals/AccountNotFoundModal';
import { AlreadySignedModal } from './modals/AlreadySignedModal';
import { ConnectionTimeoutModal } from './modals/ConnectionTimeoutModal';
import { NetworkNotAvailableModal } from './modals/NetworkNotAvailableModal';
import { OperationNotFoundModal } from './modals/OperationNotFoundModal';

export const Operations = () => {
  const { t } = useI18n();

  useChainSyncToast();

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const multisigAccounts = useUnit(operationsContextModel.$multisigAccounts);
  const filter = useUnit(operationsContextModel.$filter);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const filteredOps = useUnit(operationsContextModel.$filteredOperations);
  const sectionedOps = useUnit(operationsContextModel.$sectionedOperations);
  const collapsedSections = useUnit(operationsContextModel.$collapsedSections);
  const focusedOperationId = useUnit(deepLinkModel.$focusedOperationId);
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

  const draftsState = useDraftsSectionState(filter);
  const showDraftsGroup = showDrafts && draftsState.isAvailable;
  // The first visible group's heading is drawn above the sticky column header
  // (Page → Section → Table); the virtual list starts with that group's rows.
  const firstSection = sectionedOps[0]?.section ?? null;
  const headingAboveList = showDraftsGroup
    ? { key: 'drafts' as const, labelKey: 'operations.drafts.title', count: draftsState.count }
    : firstSection
      ? { key: firstSection, labelKey: SECTION_LABEL_KEYS[firstSection], count: sectionedOps[0]?.items.length }
      : null;
  const showTable = deferredOps.length > 0 || showDraftsGroup || sectionedOps.length > 0;

  // The first group's heading is rendered above the sticky column header, unless
  // the drafts group owns that slot.
  const flatItems = useMemo(
    () => buildFlatItems(sectionedOps, collapsedSections, { firstHeadingAbove: !showDraftsGroup }),
    [sectionedOps, collapsedSections, showDraftsGroup],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const aboveListRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Keep scrollMargin in sync with the container's offset from the scroll root. Everything above
  // the list — the first group's heading, the sticky column header, DraftsSection — has variable
  // height; without this the virtualizer computes scroll offsets relative to the wrong origin and
  // items disappear on scroll. Runs on every render, so it covers whatever Operations re-renders.
  useLayoutEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const newMargin = el.offsetTop;
    setScrollMargin(prev => (prev === newMargin ? prev : newMargin));
  });

  // The heading and the column header are siblings above the list and only change with a render.
  // The drafts block is the exception: it mutates its own height from local state (collapse toggle,
  // expandable draft rows) without re-rendering Operations, so the effect above never fires for it —
  // observe that block to keep scrollMargin following those changes.
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
    estimateSize: index => {
      const type = flatItems[index]?.type;
      if (type === 'section') return SECTION_HEADER_HEIGHT;
      if (type === 'empty') return EMPTY_SECTION_HEIGHT;

      return ROW_HEIGHT + ROW_GAP;
    },
    overscan: 15,
    scrollMargin,
    getItemKey: index => {
      const item = flatItems[index];
      if (!item) return `unknown-${index}`;
      if (item.type === 'section') return `section-${item.section}`;
      if (item.type === 'empty') return `empty-${item.section}`;

      return item.item.operation.id;
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
        <div className="h-full overflow-x-auto overflow-y-hidden" data-operations-scroller>
          <div
            className={cnTw('group/list h-full', isResizing && 'select-none')}
            data-resizing={isResizing || undefined}
            style={showTable ? { minWidth: getOperationsMinWidth(widths, { showInitiator }) } : undefined}
          >
            <ScrollArea viewportRef={scrollRef}>
              {/* The heading and the sticky column header are siblings of the list, not wrapped
                  together with it: a sticky box is bounded by its parent, so nesting the header in
                  a block that ends above the list would un-pin it as soon as that block scrolls out. */}
              {showTable && headingAboveList && (
                <SectionHeading
                  labelKey={headingAboveList.labelKey}
                  count={headingAboveList.count}
                  collapsed={!!collapsedSections[headingAboveList.key]}
                  onToggle={() => operationsContextModel.toggleSection(headingAboveList.key)}
                />
              )}
              {showTable && <OperationsTableHeader />}

              {/* Network sync progress lives in the bottom-right toast (`useChainSyncToast`),
                  so nothing is drawn between the drafts group and the first operations. */}
              <div ref={aboveListRef}>
                {showDraftsGroup && <DraftsSection scope={filter} isCollapsed={!!collapsedSections.drafts} />}
              </div>

              {!isDeferredLoading && deferredOps.length === 0 && sectionedOps.length === 0 && (
                <Box horizontalAlign="center" verticalAlign="center" height="100%" padding={[0, 0, 10]}>
                  <EmptyOperations isEmptyFromFilters={isFiltersSelected} tab={tab} />
                </Box>
              )}

              {sectionedOps.length > 0 && (
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
                        {item.type === 'section' ? (
                          <SectionHeading
                            labelKey={SECTION_LABEL_KEYS[item.section]}
                            count={item.count}
                            collapsed={!!collapsedSections[item.section]}
                            onToggle={() => operationsContextModel.toggleSection(item.section)}
                          />
                        ) : item.type === 'empty' ? (
                          <div className="mb-1.5 flex h-[60px] items-center justify-center rounded-lg border border-dashed border-shade-12">
                            <FootnoteText className="text-text-tertiary">
                              {t(SECTION_EMPTY_LABEL_KEYS[item.section] ?? 'operations.sections.inProgressEmpty')}
                            </FootnoteText>
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
