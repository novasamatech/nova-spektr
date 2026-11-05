import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { HelpText } from '@/shared/ui';
import { useChainEras, useChainHistoryDepths, useEraDurations } from '../hooks/useChainEras';
import { useStakingKpi } from '../hooks/useStakingKpi';
import { formatAssetAmounts } from '../lib/amounts';

import { ClaimModal } from './ClaimModal';
import { KpiCard } from './KpiCard';
import { EM_DASH, KpiWidgetFrame, NoSelectionCard } from './KpiWidgetFrame';
import { Price } from './Price';

type Props = {
  accountIds: string[];
  /** Part of the dashboard slot contract; this widget resolves names itself. */
  allEntries: { accountId: string; name: string; address: string }[];
};

/** What the selection earned over the window, and what is still unclaimed. */
export const RewardsWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const kpi = useStakingKpi(accountIds);
  const eras = useChainEras();
  const eraDurations = useEraDurations();
  const historyDepths = useChainHistoryDepths();
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const title = t('dashboard.staking.kpi.rewards.title');
  if (accountIds.length === 0) return <NoSelectionCard title={title} />;

  const rewardTokens = formatAssetAmounts(kpi.rewardAmounts, { sign: '+', fallback: EM_DASH });
  const showFiat = kpi.fiatFlag !== false;

  // Nothing could be loaded: there is no figure to show, and a `$0` would state
  // that the selection earned nothing.
  const unavailable = kpi.rewardsCompleteness === 'unavailable';
  const unavailableLabel = t('dashboard.staking.kpi.rewards.unavailable');

  const windowLabel = t('dashboard.staking.kpi.rewards.sublineNoFiat', { days: kpi.rewardsWindowDays });
  const totalsSubline = showFiat
    ? t('dashboard.staking.kpi.rewards.subline', { amounts: rewardTokens, days: kpi.rewardsWindowDays })
    : windowLabel;

  // A network that did not answer in full leaves the figure a lower bound. The
  // note replaces the sub-line rather than joining it: the line is one row of a
  // quarter-width card, and the warning must not be the part that is cut off.
  const subline = unavailable
    ? windowLabel
    : kpi.rewardsCompleteness === 'partial'
      ? t('dashboard.staking.kpi.rewards.incomplete', { networks: kpi.rewardsIncompleteNetworks.join(', ') })
      : totalsSubline;
  // An explicit aria-label replaces the card's inner text for screen readers,
  // so it must carry what the card shows. The system tests anchor on the title
  // prefix of this label.
  const unclaimedLabel = kpi.unclaimedFooter
    ? `${t('dashboard.staking.kpi.rewards.unclaimed')} ${formatAssetAmounts(kpi.unclaimedFooter.amounts)}`
    : null;
  // The token amounts always ride along: with fiat off the subline drops them,
  // and a label without any value announces nothing.
  const ariaLabel = [title, unavailable ? unavailableLabel : rewardTokens, subline, unclaimedLabel]
    .filter(Boolean)
    .join(', ');

  const figure = showFiat ? <Price amount={kpi.rewardsFiat} currency={kpi.currency} /> : rewardTokens;

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={title}
        ariaLabel={ariaLabel}
        // A figure missing a network that has not answered yet is neither a
        // total nor a lower bound.
        loading={kpi.pending || kpi.rewardsPending}
        valueClass={unavailable ? 'text-text-tertiary' : 'text-text-positive'}
        value={unavailable ? unavailableLabel : figure}
        subline={subline}
        footer={
          kpi.unclaimedFooter ? (
            <div className="flex items-center gap-2">
              <HelpText className="shrink-0 text-text-tertiary uppercase">
                {t('dashboard.staking.kpi.rewards.unclaimed')}
              </HelpText>
              <HelpText className="truncate">{formatAssetAmounts(kpi.unclaimedFooter.amounts)}</HelpText>
              <button
                className="ms-auto shrink-0 cursor-pointer text-caption font-semibold text-tab-text-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpen();
                }}
              >
                {t('dashboard.staking.kpi.rewards.claimLink')}
              </button>
            </div>
          ) : null
        }
        onClick={handleOpen}
      />

      {open && (
        <ClaimModal
          rows={kpi.claimRows}
          positions={kpi.positions}
          currency={kpi.currency}
          eras={eras}
          eraDurations={eraDurations}
          historyDepths={historyDepths}
          walletByAccount={kpi.walletByAccount}
          onRetryUnclaimed={kpi.retryUnclaimed}
          onClose={handleClose}
        />
      )}
    </KpiWidgetFrame>
  );
};
