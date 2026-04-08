import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type EraIndex, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Duration, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { stakingService } from '@/domains/staking';
import { AssetFiatBalance } from '@/widgets/price';

type Props = {
  api: ApiPromise | null;
  timelineApi: ApiPromise | null;
  era?: EraIndex;
  asset?: Asset;
  validators: Validator[];
};

export const AboutStaking = ({ api, timelineApi, era, asset, validators }: Props) => {
  const { t } = useI18n();

  const { getMinNominatorBond, getUnbondingPeriod, getTotalStaked } = stakingService;

  const [minimumStake, setMinimumStake] = useState('');
  const [unstakingPeriod, setUnstakingPeriod] = useState('');
  const [totalStaked, setTotalStaked] = useState('');

  useEffect(() => {
    if (!api?.isConnected || !timelineApi?.isConnected) return;

    getMinNominatorBond(api).then(setMinimumStake);
    setUnstakingPeriod(getUnbondingPeriod(api, timelineApi));

    return () => {
      setMinimumStake('');
      setUnstakingPeriod('');
    };
  }, [api]);

  useEffect(() => {
    if (!api?.isConnected || !era) return;

    getTotalStaked(api, era).then(setTotalStaked);

    return () => {
      setTotalStaked('');
    };
  }, [api, era, validators.length]);

  return (
    <div className="flex flex-col gap-y-6">
      <FootnoteText className="text-text-secondary">
        <Trans t={t} i18nKey="staking.about.aboutStakingTitle" values={{ asset: asset?.symbol }} />
      </FootnoteText>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.totalStakedLabel')}</FootnoteText>
          <div className="flex flex-col items-end justify-self-end">
            {totalStaked && asset ? (
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={totalStaked} asset={asset} className="text-footnote" />
                <AssetFiatBalance amount={totalStaked} asset={asset} />
              </div>
            ) : (
              <div className="flex flex-col items-end gap-y-0.5">
                <Skeleton width={25} height={4} />
                <Skeleton width={14} height={4} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.minimumStakeLabel')}</FootnoteText>
          <div className="flex flex-col items-end justify-self-end">
            {minimumStake && asset ? (
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={minimumStake} asset={asset} className="text-footnote" />
                <AssetFiatBalance amount={minimumStake} asset={asset} />
              </div>
            ) : (
              <div className="flex flex-col items-end gap-y-0.5">
                <Skeleton width={25} height={4} />
                <Skeleton width={14} height={4} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.stakingPeriodLabel')}</FootnoteText>
          {unstakingPeriod ? (
            <FootnoteText align="right">{t('staking.about.unlimitedLabel')}</FootnoteText>
          ) : (
            <Skeleton width={25} height="18px" />
          )}
        </div>

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.unstakingPeriodLabel')}</FootnoteText>
          {unstakingPeriod ? (
            <FootnoteText align="right">
              <Duration seconds={unstakingPeriod} />
            </FootnoteText>
          ) : (
            <Skeleton width={25} height="18px" />
          )}
        </div>
      </div>
    </div>
  );
};
