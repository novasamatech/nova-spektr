import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
import { useVisibleDrafts } from '@/features/drafts';
import {
  ExportButton,
  Operations as OperationsList,
  OperationsFilter,
  Search,
  operationsContextModel,
} from '@/features/multisig-operations';

export const operationsPresetSwitcherSlot = createSlot({ name: 'operationsPresetSwitcher' });

export const Operations = () => {
  const { t } = useI18n();
  const tab = useUnit(operationsContextModel.$tab);
  const setTab = useUnit(operationsContextModel.setTab);
  const pendingCount = useUnit(operationsContextModel.$pendingOperationsCount);
  const historyCount = useUnit(operationsContextModel.$historyOperationsCount);
  const hiddenCount = useUnit(operationsContextModel.$hiddenOperationsCount);
  const isScopeMerged = useUnit(operationsContextModel.$isScopeMerged);
  const visibleCount = useUnit(operationsContextModel.$visibleOperationsCount);
  const filter = useUnit(operationsContextModel.$filter);
  // Scoped by the same non-status filters as the operations list, so the
  // merged count only includes drafts the section actually shows.
  const { drafts: visibleDrafts } = useVisibleDrafts(filter);

  // The merged scope hosts the drafts section (gated by the Status filter), so
  // its rows join the "All operations" total.
  const draftsInScope = filter.status.length === 0 || filter.status.includes('drafts');
  const mergedCount = visibleCount + (draftsInScope ? visibleDrafts.length : 0);

  const noop = () => {};

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Header title={t('operations.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <div className="flex items-center gap-x-2">
          <Box width="230px">
            <Search />
          </Box>
          <Slot id={operationsPresetSwitcherSlot} />
        </div>
      </Header>

      <div className="flex min-h-0 w-full min-w-[1060px] flex-1 flex-col px-4">
        <div className="flex w-full items-center justify-between py-4">
          {isScopeMerged ? (
            <div className="mb-2 flex shrink-0 gap-x-1 rounded-md bg-tab-background p-0.5">
              <div className="flex w-full cursor-default items-center justify-center gap-1 rounded-sm bg-white px-4 py-1.5 text-button-small text-text-primary shadow-card-shadow">
                {t('operations.tabs.all')}
                <span className="ml-1 text-text-tertiary">{mergedCount}</span>
              </div>
            </div>
          ) : (
            <Tabs value={tab} onChange={noop}>
              <Tabs.List>
                <span className="contents" onClick={() => setTab('pending')}>
                  <Tabs.Trigger value="pending">
                    {t('operations.tabs.pending')}
                    {pendingCount > 0 && <span className="ml-1 text-text-tertiary">{pendingCount}</span>}
                  </Tabs.Trigger>
                </span>
                <span className="contents" onClick={() => setTab('history')}>
                  <Tabs.Trigger value="history">
                    {t('operations.tabs.history')}
                    {historyCount > 0 && <span className="ml-1 text-text-tertiary">{historyCount}</span>}
                  </Tabs.Trigger>
                </span>
                {hiddenCount > 0 && (
                  <span className="contents" onClick={() => setTab('hidden')}>
                    <Tabs.Trigger value="hidden">
                      {t('operations.tabs.hidden')}
                      <span className="ml-1 text-text-tertiary">{hiddenCount}</span>
                    </Tabs.Trigger>
                  </span>
                )}
              </Tabs.List>
            </Tabs>
          )}

          <div className="flex items-center gap-2">
            <OperationsFilter />
            <ExportButton />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <OperationsList />
        </div>
      </div>
    </div>
  );
};
