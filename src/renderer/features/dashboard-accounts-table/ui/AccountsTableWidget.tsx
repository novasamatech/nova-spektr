import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { DashboardWidget } from '@/pages/Dashboard';
import { useAccountsTable } from '../hooks/useAccountsTable';

import { AccountsTableFullScreen } from './AccountsTableFullScreen';
import { AccountsTableView } from './AccountsTableView';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

export const AccountsTableWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();

  const table = useAccountsTable({ accountIds, allEntries });
  const [fullScreen, setFullScreen] = useState(false);

  return (
    // `card={false}` + our own chrome (same classes as DashboardWidget's CARD_CLASS,
    // but no padding): the header's `border-b` needs to reach the card edges, and
    // the row dividers must be full-bleed too — see KpiWidgetFrame for the same
    // precedent. DashboardWidget still wraps `children` in its own
    // `min-h-0 flex-1 overflow-y-auto` div regardless of `card`, and only the rows
    // region below should scroll — the header/filter bar must stay fixed. So the
    // view's own root is `h-full overflow-hidden`: it exactly fills DashboardWidget's
    // wrapper and never scrolls itself, leaving the rows region as the single
    // active scroller.
    <DashboardWidget card={false}>
      <AccountsTableView
        table={table}
        className="rounded-lg border border-token-container-border bg-white shadow-card-shadow"
        leadingAction={
          <span title={t('dashboard.accountsTable.fullView')} className="shrink-0">
            <IconButton
              name="expand"
              size={16}
              ariaLabel={t('dashboard.accountsTable.fullView')}
              onClick={() => setFullScreen(true)}
            />
          </span>
        }
      />

      <AccountsTableFullScreen table={table} isOpen={fullScreen} onToggle={setFullScreen} />
    </DashboardWidget>
  );
};
