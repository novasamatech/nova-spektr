import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
import {
  type TabFilter,
  Operations as OperationsList,
  OperationsFilter,
  Search,
  operationsContextModel,
} from '@/features/multisig-operations';

export const Operations = () => {
  const { t } = useI18n();
  const tab = useUnit(operationsContextModel.$tab);
  const setTab = useUnit(operationsContextModel.setTab);
  const pendingCount = useUnit(operationsContextModel.$pendingOperationsCount);
  const hiddenCount = useUnit(operationsContextModel.$hiddenOperationsCount);

  const handleTabChange = (value: string) => {
    setTab(value as TabFilter);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Header title={t('operations.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <Box width="230px">
          <Search />
        </Box>
      </Header>

      <div className="mx-auto flex h-full w-full max-w-[1084px] flex-col">
        <div className="flex w-full items-center justify-between py-4">
          <Tabs value={tab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Trigger value="pending">
                {t('operations.tabs.pending')}
                {pendingCount > 0 && <span className="ml-1 text-text-tertiary">{pendingCount}</span>}
              </Tabs.Trigger>
              <Tabs.Trigger value="history">{t('operations.tabs.history')}</Tabs.Trigger>
              {hiddenCount > 0 && (
                <Tabs.Trigger value="hidden">
                  {t('operations.tabs.hidden')}
                  <span className="ml-1 text-text-tertiary">{hiddenCount}</span>
                </Tabs.Trigger>
              )}
            </Tabs.List>
          </Tabs>

          <div className="flex gap-2">
            <OperationsFilter />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <OperationsList />
        </div>
      </div>
    </div>
  );
};
