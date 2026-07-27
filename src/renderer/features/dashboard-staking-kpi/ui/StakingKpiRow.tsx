import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { DashboardWidget } from '@/pages/Dashboard';
import { useChainEras, useEraDurations } from '../hooks/useChainEras';
import { useStakingKpi } from '../hooks/useStakingKpi';
import { formatAssetAmounts } from '../lib/amounts';

import { type BreakdownMode, BreakdownModal } from './BreakdownModal';
import { ClaimModal } from './ClaimModal';
import { ExpiryChip } from './ExpiryChip';
import { KpiCard } from './KpiCard';
import { PositionsModal } from './PositionsModal';
import { Price } from './Price';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

type OpenModal = 'positions' | 'claim' | BreakdownMode | null;

const EM_DASH = '—';

export const StakingKpiRow = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const kpi = useStakingKpi(accountIds);
  const eras = useChainEras();
  const eraDurations = useEraDurations();
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  const closeModal = useCallback(() => setOpenModal(null), []);
  const openPositions = useCallback(() => setOpenModal('positions'), []);
  const openApy = useCallback(() => setOpenModal('apy'), []);
  const openNominations = useCallback(() => setOpenModal('nominations'), []);
  const openClaim = useCallback(() => setOpenModal('claim'), []);

  if (accountIds.length === 0) {
    return (
      <DashboardWidget colSpan={4}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.staking.kpi.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const { pending, currency } = kpi;
  const stakedSubline = formatAssetAmounts(kpi.stakedAmounts, { fallback: EM_DASH });
  const rewardsSubline = formatAssetAmounts(kpi.rewardAmounts, { sign: '+', fallback: EM_DASH });

  return (
    <DashboardWidget colSpan={4} card={false}>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title={t('dashboard.staking.kpi.totalStaked.title')}
          ariaLabel={t('dashboard.staking.kpi.totalStaked.title')}
          loading={pending}
          value={<Price amount={kpi.totalStakedFiat} currency={currency} />}
          subline={stakedSubline}
          footer={
            kpi.unbondingFooter ? (
              <div className="flex items-center gap-2">
                <HelpText className="shrink-0 text-text-tertiary uppercase">
                  {t('dashboard.staking.kpi.totalStaked.unbonding')}
                </HelpText>
                <HelpText className="truncate">{formatAssetAmounts(kpi.unbondingFooter.amounts)}</HelpText>
                {kpi.unbondingFooter.withdrawableCount > 0 && (
                  <span className="shrink-0 rounded-full bg-badge-green-background-default px-2 py-0.5 text-caption text-text-positive">
                    {t('dashboard.staking.kpi.totalStaked.withdrawable', {
                      count: kpi.unbondingFooter.withdrawableCount,
                    })}
                  </span>
                )}
                <button
                  className="ms-auto shrink-0 cursor-pointer text-caption font-semibold text-tab-text-accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    openPositions();
                  }}
                >
                  {t('dashboard.staking.kpi.totalStaked.redeemLink')}
                </button>
              </div>
            ) : null
          }
          onClick={openPositions}
        />

        <KpiCard
          title={t('dashboard.staking.kpi.apy.title')}
          ariaLabel={t('dashboard.staking.kpi.apy.title')}
          loading={pending}
          valueClass={kpi.weightedApy === null ? 'text-text-tertiary' : 'text-text-positive'}
          value={
            kpi.weightedApy === null
              ? EM_DASH
              : t('dashboard.staking.kpi.apy.value', { apy: kpi.weightedApy.toFixed(1) })
          }
          subline={t('dashboard.staking.kpi.apy.subline', { count: kpi.earningPositionCount })}
          onClick={openApy}
        />

        <KpiCard
          title={t('dashboard.staking.kpi.nominations.title')}
          ariaLabel={t('dashboard.staking.kpi.nominations.title')}
          loading={pending}
          value={kpi.activeValidatorCount}
          subline={t('dashboard.staking.kpi.nominations.subline', { count: kpi.positionCount })}
          onClick={openNominations}
        />

        <KpiCard
          title={t('dashboard.staking.kpi.rewards.title')}
          ariaLabel={t('dashboard.staking.kpi.rewards.title')}
          loading={pending}
          valueClass="text-text-positive"
          value={<Price amount={kpi.rewardsFiat} currency={currency} />}
          subline={t('dashboard.staking.kpi.rewards.subline', {
            amounts: rewardsSubline,
            days: kpi.rewardsWindowDays,
          })}
          footer={
            kpi.unclaimedFooter ? (
              <div className="flex items-center gap-2">
                <HelpText className="shrink-0 text-text-tertiary uppercase">
                  {t('dashboard.staking.kpi.rewards.unclaimed')}
                </HelpText>
                <HelpText className="truncate">{formatAssetAmounts(kpi.unclaimedFooter.amounts)}</HelpText>
                {kpi.unclaimedFooter.daysUntilExpiry !== null && (
                  <ExpiryChip daysLeft={kpi.unclaimedFooter.daysUntilExpiry} />
                )}
                <button
                  className="ms-auto shrink-0 cursor-pointer text-caption font-semibold text-tab-text-accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    openClaim();
                  }}
                >
                  {t('dashboard.staking.kpi.rewards.claimLink')}
                </button>
              </div>
            ) : null
          }
          onClick={openClaim}
        />
      </div>

      {openModal === 'positions' && (
        <PositionsModal
          rows={kpi.positionRows}
          currency={currency}
          walletByAccount={kpi.walletByAccount}
          onClose={closeModal}
        />
      )}

      {openModal === 'claim' && (
        <ClaimModal
          rows={kpi.claimRows}
          currency={currency}
          eras={eras}
          eraDurations={eraDurations}
          walletByAccount={kpi.walletByAccount}
          onClose={closeModal}
        />
      )}

      {(openModal === 'apy' || openModal === 'nominations') && (
        <BreakdownModal
          mode={openModal}
          rows={kpi.breakdownRows}
          currency={currency}
          totalFiat={kpi.totalStakedFiat}
          headline={
            openModal === 'apy'
              ? kpi.weightedApy === null
                ? EM_DASH
                : t('dashboard.staking.kpi.apy.value', { apy: kpi.weightedApy.toFixed(1) })
              : t('dashboard.staking.kpi.nominations.count', { count: kpi.activeValidatorCount })
          }
          headlineClass={openModal === 'apy' ? 'text-text-positive' : undefined}
          walletByAccount={kpi.walletByAccount}
          onClose={closeModal}
        />
      )}
    </DashboardWidget>
  );
};
