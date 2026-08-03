import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { HelpText } from '@/shared/ui';
import { useStakingKpi } from '../hooks/useStakingKpi';
import { formatAssetAmounts } from '../lib/amounts';

import { KpiCard } from './KpiCard';
import { EM_DASH, KpiWidgetFrame, NoSelectionCard } from './KpiWidgetFrame';
import { PositionsModal } from './PositionsModal';
import { Price } from './Price';

type Props = {
  accountIds: string[];
  /** Part of the dashboard slot contract; this widget resolves names itself. */
  allEntries: { accountId: string; name: string; address: string }[];
};

/** Everything the selection has bonded, and what is on its way out of it. */
export const TotalStakedWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const kpi = useStakingKpi(accountIds);
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const title = t('dashboard.staking.kpi.totalStaked.title');
  if (accountIds.length === 0) return <NoSelectionCard title={title} />;

  const stakedTokens = formatAssetAmounts(kpi.stakedAmounts, { fallback: EM_DASH });
  // With fiat switched off in Settings the card leads with the token amounts
  // instead — the same figures the subline carries, so nothing is lost and the
  // subline would only repeat the headline.
  const showFiat = kpi.fiatFlag !== false;

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={title}
        ariaLabel={title}
        loading={kpi.pending}
        value={showFiat ? <Price amount={kpi.totalStakedFiat} currency={kpi.currency} /> : stakedTokens}
        subline={showFiat ? stakedTokens : null}
        footer={
          kpi.unbondingFooter ? (
            <div className="flex items-center gap-2">
              <HelpText className="shrink-0 text-text-tertiary uppercase">
                {t('dashboard.staking.kpi.totalStaked.unbonding')}
              </HelpText>
              <HelpText className="truncate">{formatAssetAmounts(kpi.unbondingFooter.amounts)}</HelpText>
              <button
                className="ms-auto shrink-0 cursor-pointer text-caption font-semibold text-tab-text-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpen();
                }}
              >
                {t('dashboard.staking.kpi.totalStaked.redeemLink')}
              </button>
            </div>
          ) : null
        }
        onClick={handleOpen}
      />

      {open && (
        <PositionsModal
          rows={kpi.positionRows}
          positions={kpi.positions}
          currency={kpi.currency}
          walletByAccount={kpi.walletByAccount}
          onClose={handleClose}
        />
      )}
    </KpiWidgetFrame>
  );
};
