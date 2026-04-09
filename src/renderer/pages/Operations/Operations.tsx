import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
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
  const hiddenCount = useUnit(operationsContextModel.$hiddenOperationsCount);

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
          <Tabs value={tab} onChange={noop}>
            <Tabs.List>
              <span className="contents" onClick={() => setTab('pending')}>
                <Tabs.Trigger value="pending">
                  {t('operations.tabs.pending')}
                  {pendingCount > 0 && <span className="ml-1 text-text-tertiary">{pendingCount}</span>}
                </Tabs.Trigger>
              </span>
              <span className="contents" onClick={() => setTab('history')}>
                <Tabs.Trigger value="history">{t('operations.tabs.history')}</Tabs.Trigger>
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
