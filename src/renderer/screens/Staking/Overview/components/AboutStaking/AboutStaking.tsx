import { useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';
import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Expandable } from '@renderer/components/common';
import { Balance, Icon } from '@renderer/components/ui';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { Validator } from '@renderer/domain/validator';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';

type Props = {
  asset?: Asset;
  validators: Validator[];
  api?: ApiPromise;
  className?: string;
};

const apyToMonthlyRate = (apy: number) => {
  const monthly = Math.pow(1 + apy / 100, 1 / 12) - 1;

  return (monthly * 100).toFixed(2);
};

const AboutStaking = ({ asset, api, validators, className }: Props) => {
  const { t } = useI18n();

  const { getMinNominatorBond, getUnbondingPeriod, getTotalStaked } = useStakingData();

  const [minimumStake, setMinimumStake] = useState('');
  const [unstakingPeriod, setUnstakingPeriod] = useState('');
  const [totalStaked, setTotalStaked] = useState('');

  useEffect(() => {
    (async () => {
      if (!asset || !api) return;

      setMinimumStake(await getMinNominatorBond(api));
      setUnstakingPeriod(getUnbondingPeriod(api));
      setTotalStaked(await getTotalStaked(api));
    })();
  }, [asset, api]);

  const maximumApy = validators.reduce((acc, validator) => (acc > validator.apy ? acc : validator.apy), 0);
  const averageApy = validators.length && (validators[0].avgApy * 100).toFixed(2);

  const activeNominatorsAmount = new Set(
    validators.reduce<string[]>((acc, validator) => [...acc, ...validator.nominators], []),
  ).size;

  return (
    <>
      <Expandable
        defaultActive={false}
        itemClass="font-semibold text-neutral-variant"
        wrapperClass={cn('w-full shadow-surface p-4 rounded-2lg', className)}
        full
        item={
          <div className="flex items-center gap-2.5">
            <Icon name="staking" />
            <Trans t={t} i18nKey="staking.about.aboutStakingTitle" values={{ asset: asset?.symbol }} />
          </div>
        }
      >
        <div className="flex gap-12 text-neutral-variant text-sm">
          <div className="flex-1">
            <div className="flex justify-between items-center h-10">
              {t('staking.about.totalStakedLabel')}
              <div className="flex font-semibold">
                {totalStaked ? (
                  <>
                    <Balance value={totalStaked} precision={asset?.precision || 0} />
                    &nbsp;{asset?.symbol}
                  </>
                ) : (
                  <Shimmering width={100} height={20} />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center h-10">
              {t('staking.about.minimumStakeLabel')}
              <div className=" flex font-semibold">
                {minimumStake ? (
                  <>
                    <Balance value={minimumStake} precision={asset?.precision || 0} />
                    &nbsp;{asset?.symbol}
                  </>
                ) : (
                  <Shimmering width={100} height={20} />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center h-10">
              {t('staking.about.activeNominatorsLabel')}

              <div className="font-semibold">
                {activeNominatorsAmount ? activeNominatorsAmount : <Shimmering width={100} height={20} />}
              </div>
            </div>
            <div className="flex justify-between items-center h-10">
              {t('staking.about.stakingPeriodLabel')}
              <div className="font-semibold">
                {unstakingPeriod ? t('staking.about.unlimitedLabel') : <Shimmering width={100} height={20} />}
              </div>
            </div>
            <div className="flex justify-between items-center h-10">
              {t('staking.about.unstakingPeriodLabel')}
              <div className="font-semibold">
                {unstakingPeriod ? (
                  <Trans t={t} i18nKey="staking.about.unstakingPeriodValue" values={{ period: unstakingPeriod }} />
                ) : (
                  <Shimmering width={100} height={20} />
                )}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-2.5">
              <Trans t={t} i18nKey="staking.about.earningsTitle" values={{ asset: asset?.symbol }} />
            </div>
            <div className="flex gap-2.5 mb-4">
              <div className={'flex-1 bg-white border-2 border-shade-2 rounded-2lg py-7.5'}>
                <div className="text-success text-3xl w-fit m-auto">
                  {maximumApy ? `${apyToMonthlyRate(maximumApy)}%` : <Shimmering width={100} height={36} />}
                </div>
                <div className="text-shade-30 text-xs w-fit m-auto">{t('staking.about.monthlyEarningLabel')}</div>
              </div>
              <div className={'flex-1 bg-white border-2 border-shade-2 rounded-2lg py-7.5'}>
                <div className="text-success text-3xl w-fit m-auto">
                  {maximumApy ? `${maximumApy}%` : <Shimmering width={100} height={36} />}
                </div>
                <div className="text-shade-30 text-xs w-fit m-auto">{t('staking.about.yearlyEarningLabel')}</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-2xs mb-1">
              <div className="uppercase">{t('staking.about.maximumApyLabel')}</div>
              {maximumApy ? `${maximumApy}%` : <Shimmering width={100} height={12} />}
            </div>
            <div className="flex justify-between items-center text-2xs mb-1">
              <div className="uppercase">{t('staking.about.averageApyLabel')}</div>
              {averageApy ? `${averageApy}%` : <Shimmering width={100} height={12} />}
            </div>
          </div>
        </div>
      </Expandable>
    </>
  );
};

export default AboutStaking;
