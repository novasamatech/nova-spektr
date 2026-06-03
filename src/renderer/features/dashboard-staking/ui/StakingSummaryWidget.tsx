import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { useStakingOverview } from '../hooks/useStakingOverview';

import { Price } from './Price';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

export const StakingSummaryWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const { chains, stakingDataByChain, totalFiat, pending, fiatFlag, currency } = useStakingOverview(accountIds);

  const averageApy = useMemo(() => {
    const apys = chains.map((c) => c.apy).filter((a): a is string => a !== undefined);
    if (apys.length === 0) return null;

    const sum = apys.reduce((acc, apy) => acc + parseFloat(apy), 0);

    return (sum / apys.length).toFixed(2);
  }, [chains]);

  const uniqueStakingAccounts = useMemo(() => {
    const accountSet = new Set<string>();
    for (const stakingMap of Object.values(stakingDataByChain)) {
      for (const [accountId, stake] of Object.entries(stakingMap)) {
        if (stake) {
          accountSet.add(accountId);
        }
      }
    }

    return accountSet.size;
  }, [stakingDataByChain]);

  if (!fiatFlag) return null;

  const hasStaking = chains.length > 0;

  return (
    <DashboardWidget>
      <FootnoteText className="text-text-tertiary">{t('dashboard.stakingSummary.title')}</FootnoteText>

      {pending && !hasStaking && (
        <div className="mt-3 flex gap-6">
          <Skeleton width={30} height={5} />
          <Skeleton width={30} height={5} />
          <Skeleton width={30} height={5} />
        </div>
      )}

      {!pending && !hasStaking && (
        <div className="flex items-center py-4">
          <BodyText className="text-text-tertiary">{t('dashboard.stakingSummary.noStaking')}</BodyText>
        </div>
      )}

      {hasStaking && (
        <div className="mt-3 flex gap-6">
          <div className="flex flex-col gap-1">
            <FootnoteText className="text-text-tertiary">{t('dashboard.stakingSummary.averageApy')}</FootnoteText>
            {averageApy ? (
              <FootnoteText className="text-text-positive">{averageApy}%</FootnoteText>
            ) : (
              <Skeleton width={12} height={4} />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <FootnoteText className="text-text-tertiary">{t('dashboard.stakingSummary.stakingAccounts')}</FootnoteText>
            <FootnoteText>{uniqueStakingAccounts}</FootnoteText>
          </div>

          <div className="flex flex-col gap-1">
            <FootnoteText className="text-text-tertiary">{t('dashboard.stakingSummary.totalStaked')}</FootnoteText>
            <FootnoteText>
              {pending ? <Skeleton width={20} height={4} /> : <Price amount={totalFiat ?? '0'} currency={currency} />}
            </FootnoteText>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
};
