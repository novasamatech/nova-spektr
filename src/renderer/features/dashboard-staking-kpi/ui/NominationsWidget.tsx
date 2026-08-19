import { useUnit } from 'effector-react';
import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { networkModel } from '@/entities/network';
import { useStakingKpi } from '../hooks/useStakingKpi';

import { KpiCard } from './KpiCard';
import { KpiWidgetFrame, NoSelectionCard } from './KpiWidgetFrame';
import { NominationsModal } from './NominationsModal';

type Props = {
  accountIds: string[];
  /** Part of the dashboard slot contract; this widget resolves names itself. */
  allEntries: { accountId: string; name: string; address: string }[];
};

/** How many distinct validators the selection nominates, counted per chain. */
export const NominationsWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const kpi = useStakingKpi(accountIds);
  const chains = useUnit(networkModel.$chains);
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const title = t('dashboard.staking.kpi.nominations.title');
  if (accountIds.length === 0) return <NoSelectionCard title={title} />;

  const subline = t('dashboard.staking.kpi.nominations.subline', { count: kpi.activeValidatorCount });
  // An explicit aria-label replaces the card's inner text for screen readers,
  // so it must carry what the card shows. The system tests anchor on the title
  // prefix of this label.
  const ariaLabel = [title, String(kpi.nominationRows.length), subline].join(', ');

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={title}
        ariaLabel={ariaLabel}
        loading={kpi.pending}
        value={kpi.nominationRows.length}
        subline={subline}
        onClick={handleOpen}
      />

      {open && (
        <NominationsModal
          positions={kpi.positions}
          chains={chains}
          currency={kpi.currency}
          walletByAccount={kpi.walletByAccount}
          onClose={handleClose}
        />
      )}
    </KpiWidgetFrame>
  );
};
