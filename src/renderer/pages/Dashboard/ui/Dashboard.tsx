import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Header, SmallTitleText } from '@/shared/ui';
import { dashboardModel } from '../model/dashboard-model';

import { DashboardAccountSelector } from './DashboardAccountSelector';

export const dashboardWidgetsSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardWidgets' });

export const Dashboard = () => {
  const { t } = useI18n();
  const allEntries = useUnit(dashboardModel.$allEntries);
  const selectedIds = useUnit(dashboardModel.$selectedIds);

  const accountIds = useMemo(() => {
    const selectedIdSet = new Set(selectedIds);
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (selectedIdSet.has(entry.id)) {
        ids.add(entry.accountId);
      }
    }

    return Array.from(ids);
  }, [allEntries, selectedIds]);

  return (
    <section className="flex h-full flex-col">
      <Header title={t('dashboard.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        {allEntries.length > 0 && <DashboardAccountSelector />}
      </Header>

      {allEntries.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-y-2">
            <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
            <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
          <Slot id={dashboardWidgetsSlot} props={{ accountIds, allEntries }} />
        </div>
      )}
    </section>
  );
};
