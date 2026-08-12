import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { DashboardWidget } from '@/pages/Dashboard';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

// Props are unused so far — this is the empty shell for Task 1 of the
// accounts-table-widget plan. Later tasks add filtering/grouping over
// `accountIds` / `allEntries`.
export const AccountsTableWidget = (_props: Props) => {
  const { t } = useI18n();

  return (
    // `card={false}` + our own chrome (same classes as DashboardWidget's CARD_CLASS,
    // but no padding): the header's `border-b` needs to reach the card edges, and
    // later tasks' row dividers must be full-bleed too — see KpiWidgetFrame for the
    // same precedent.
    <DashboardWidget card={false}>
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-token-container-border bg-white shadow-card-shadow">
        <div className="flex items-center gap-3 border-b border-divider px-4 py-3.5">
          <SmallTitleText>{t('dashboard.accountsTable.title')}</SmallTitleText>
        </div>
      </div>
    </DashboardWidget>
  );
};
