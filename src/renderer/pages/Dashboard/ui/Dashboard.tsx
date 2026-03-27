import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Header, IconButton, SmallTitleText } from '@/shared/ui';
import { Tabs } from '@/shared/ui-kit';
import { dashboardModel } from '../model/dashboard-model';

import { DashboardGrid } from './DashboardGrid';

export const dashboardPresetSwitcherSlot = createSlot({ name: 'dashboardPresetSwitcher' });

export const dashboardWidgetsSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardWidgets' });

export const dashboardStakingSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardStaking' });

export const dashboardGovernanceSlot = createSlot<{
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
}>({ name: 'dashboardGovernance' });

const TABS = ['overview', 'staking', 'governance', 'alerts'] as const;

export const Dashboard = () => {
  const { t } = useI18n();
  const allEntries = useUnit(dashboardModel.$allEntries);
  const selectedIds = useUnit(dashboardModel.$selectedIds);
  const activeTab = useUnit(dashboardModel.$activeTab);
  const editMode = useUnit(dashboardModel.$editMode);
  const editModeToggled = useUnit(dashboardModel.editModeToggled);

  const accountIdsKey = useMemo(() => {
    const selectedIdSet = new Set(selectedIds);
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (selectedIdSet.has(entry.id)) {
        ids.add(entry.accountId);
      }
    }

    return [...ids].sort().join('\0');
  }, [allEntries, selectedIds]);

  const accountIds = useMemo(() => (accountIdsKey ? accountIdsKey.split('\0') : []), [accountIdsKey]);

  const slimEntries = useMemo(
    () => allEntries.map((e) => ({ accountId: e.accountId, name: e.name, address: e.address })),
    [allEntries],
  );

  return (
    <section className="flex h-full flex-col">
      <Header title={t('dashboard.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        {allEntries.length > 0 && (
          <div className="flex items-center gap-x-2">
            <IconButton className={editMode ? 'text-icon-accent' : ''} name="edit" onClick={editModeToggled} />
            <Slot id={dashboardPresetSwitcherSlot} />
          </div>
        )}
      </Header>

      <div className="flex min-h-0 flex-1 flex-col px-4">
        <Tabs value={activeTab} onChange={dashboardModel.tabChanged}>
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
            {activeTab === 'overview' &&
              (allEntries.length === 0 ? (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="flex flex-col items-center gap-y-2">
                    <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
                    <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
                  </div>
                </div>
              ) : (
                <DashboardGrid
                  slot={dashboardWidgetsSlot}
                  tab="overview"
                  editMode={editMode}
                  props={{ accountIds, allEntries: slimEntries }}
                />
              ))}
          </Tabs.Content>

          <Tabs.Content value="staking">
            {activeTab === 'staking' &&
              (allEntries.length === 0 ? (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="flex flex-col items-center gap-y-2">
                    <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
                    <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
                  </div>
                </div>
              ) : (
                <DashboardGrid
                  slot={dashboardStakingSlot}
                  tab="staking"
                  editMode={editMode}
                  props={{ accountIds, allEntries: slimEntries }}
                />
              ))}
          </Tabs.Content>

          <Tabs.Content value="governance">
            {activeTab === 'governance' &&
              (allEntries.length === 0 ? (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="flex flex-col items-center gap-y-2">
                    <SmallTitleText className="text-text-tertiary">{t('dashboard.emptyState.title')}</SmallTitleText>
                    <BodyText className="text-text-tertiary">{t('dashboard.emptyState.description')}</BodyText>
                  </div>
                </div>
              ) : (
                <DashboardGrid
                  slot={dashboardGovernanceSlot}
                  tab="governance"
                  editMode={editMode}
                  props={{ accountIds, allEntries: slimEntries }}
                />
              ))}
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
