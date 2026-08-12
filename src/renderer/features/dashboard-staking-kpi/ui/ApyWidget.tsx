import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { HelpText } from '@/shared/ui';
import { useStakingKpi } from '../hooks/useStakingKpi';
import { NETWORK_AVG_MIN_COVERAGE } from '../lib/apy';

import { BreakdownModal } from './BreakdownModal';
import { KpiCard } from './KpiCard';
import { EM_DASH, KpiWidgetFrame, NoSelectionCard } from './KpiWidgetFrame';

type Props = {
  accountIds: string[];
  /** Part of the dashboard slot contract; this widget resolves names itself. */
  allEntries: { accountId: string; name: string; address: string }[];
};

/** A stake-weighted blend of the per-chain network APYs of the earning stake. */
export const ApyWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const kpi = useStakingKpi(accountIds);
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const title = t('dashboard.staking.kpi.apy.title');
  if (accountIds.length === 0) return <NoSelectionCard title={title} />;

  // Nothing weighable is an em dash, never a confident `0.0%`.
  const headline =
    kpi.weightedApy === null ? EM_DASH : t('dashboard.staking.kpi.apy.value', { apy: kpi.weightedApy.toFixed(1) });

  // The benchmark renders only when it describes the same portfolio as the
  // headline: full weight coverage, and a headline that exists at all.
  const networkAvg =
    !kpi.pending &&
    kpi.weightedApy !== null &&
    kpi.networkAvg !== null &&
    kpi.networkAvg.coverage >= NETWORK_AVG_MIN_COVERAGE
      ? t('dashboard.staking.kpi.apy.networkAvg', {
          rate: kpi.networkAvg.rate.toFixed(1),
          days: kpi.networkAvg.days,
        })
      : null;

  const ariaLabel = [title, headline, networkAvg].filter(Boolean).join(', ');

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={title}
        ariaLabel={ariaLabel}
        loading={kpi.pending}
        valueClass={kpi.weightedApy === null ? 'text-text-tertiary' : 'text-text-positive'}
        value={headline}
        subline={t('dashboard.staking.kpi.apy.subline', { count: kpi.earningPositionCount })}
        footer={networkAvg ? <HelpText className="text-text-tertiary">{networkAvg}</HelpText> : undefined}
        onClick={handleOpen}
      />

      {open && (
        <BreakdownModal
          rows={kpi.breakdownRows}
          currency={kpi.currency}
          totalFiat={kpi.totalStakedFiat}
          headline={headline}
          headlineClass="text-text-positive"
          walletByAccount={kpi.walletByAccount}
          onClose={handleClose}
        />
      )}
    </KpiWidgetFrame>
  );
};
