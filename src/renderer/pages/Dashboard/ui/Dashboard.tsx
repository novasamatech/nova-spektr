import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Header, SmallTitleText } from '@/shared/ui';
import { Tabs } from '@/shared/ui-kit';
import { dashboardModel } from '../model/dashboard-model';

import { DashboardAccountSelector } from './DashboardAccountSelector';

export const dashboardWidgetsSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardWidgets' });

export const dashboardStakingSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardStaking' });

const TABS = ['overview', 'staking', 'governance', 'alerts'] as const;

export const Dashboard = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>('overview');
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

      <div className="flex min-h-0 flex-1 flex-col px-4">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <div className="w-fit">
            <Tabs.List>
              {TABS.map((tab) => (
                <Tabs.Trigger key={tab} value={tab}>
                  {t(`dashboard.tabs.${tab}`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          <Tabs.Content value="overview">
            {allEntries.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-y-2">
                  <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
                  <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-wrap items-start gap-4 overflow-y-auto py-4">
                <Slot id={dashboardWidgetsSlot} props={{ accountIds, allEntries }} />
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="staking">
            {allEntries.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-y-2">
                  <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
                  <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-wrap items-start gap-4 overflow-y-auto py-4">
                <Slot id={dashboardStakingSlot} props={{ accountIds, allEntries }} />
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="governance">
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
              <SmallTitleText className="text-text-tertiary">{t('dashboard.tabs.governance')}</SmallTitleText>
              <BodyText className="text-text-tertiary">{t('dashboard.tabs.comingSoon')}</BodyText>
            </div>
          </Tabs.Content>

          <Tabs.Content value="alerts">
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
              <SmallTitleText className="text-text-tertiary">{t('dashboard.tabs.alerts')}</SmallTitleText>
              <BodyText className="text-text-tertiary">{t('dashboard.tabs.comingSoon')}</BodyText>
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </section>
  );
};
