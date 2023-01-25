import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { Expandable } from '@renderer/components/common';
import { Balance, Icon } from '@renderer/components/ui';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, EraIndex } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { getAvgApy } from '@renderer/services/staking/apyCalculator';
import { useStakingData } from '@renderer/services/staking/stakingDataService';

type Props = {
  asset?: Asset;
  validators: Validator[];
  api?: ApiPromise;
  era?: EraIndex;
  className?: string;
};

const apyToMonthlyRate = (apy: number) => {
  const monthly = Math.pow(1 + apy / 100, 1 / 12) - 1;

  return (monthly * 100).toFixed(2);
};

const AboutStaking = ({ asset, api, validators, era, className }: Props) => {
  const { t } = useI18n();

  const { getMinNominatorBond, getUnbondingPeriod, getTotalStaked } = useStakingData();

  const [minimumStake, setMinimumStake] = useState('');
  const [unstakingPeriod, setUnstakingPeriod] = useState('');
  const [totalStaked, setTotalStaked] = useState('');
  const [averageApy, setAverageApy] = useState('');

  useEffect(() => {
    (async () => {
      if (!api) return;

      setMinimumStake(await getMinNominatorBond(api));
      setUnstakingPeriod(getUnbondingPeriod(api));
    })();

    return () => {
      setMinimumStake('');
      setUnstakingPeriod('');
    };
  }, [api]);

  useEffect(() => {
    (async () => {
      if (!api || !era) return;

      setAverageApy(await getAvgApy(api, validators));
    })();

    return () => setAverageApy('');
  }, [api, validators.length]);

  useEffect(() => {
    (async () => {
      if (!api || !era) return;

      setTotalStaked(await getTotalStaked(api, era));
    })();

    return () => setTotalStaked('');
  }, [api, era]);

  const maximumApy = validators.reduce((acc, validator) => (acc > validator.apy ? acc : validator.apy), 0);

  const activeNominatorsAmount = useMemo(() => {
    const nominatorsAddresses = validators.reduce<AccountID[]>((acc, { nominators }) => {
      const addresses = nominators.map((nominator) => nominator.who);

      return acc.concat(addresses);
    }, []);

    return new Set(nominatorsAddresses).size;
  }, [validators.length]);

  return (
    <Expandable
      full
      defaultActive={false}
      itemClass="font-semibold text-neutral-variant"
      wrapperClass={cn('w-full shadow-surface p-4 rounded-2lg bg-white', className)}
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
                <Balance value={totalStaked} precision={asset?.precision || 0} symbol={asset?.symbol} />
              ) : (
                <Shimmering width={100} height={20} />
              )}
            </div>
          </div>
          <div className="flex justify-between items-center h-10">
            {t('staking.about.minimumStakeLabel')}
            <div className="flex font-semibold">
              {minimumStake ? (
                <Balance value={minimumStake} precision={asset?.precision || 0} symbol={asset?.symbol} />
              ) : (
                <Shimmering width={100} height={20} />
              )}
            </div>
          </div>
          <div className="flex justify-between items-center h-10">
            {t('staking.about.activeNominatorsLabel')}

            <div className="font-semibold">{activeNominatorsAmount || <Shimmering width={100} height={20} />}</div>
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
  );
};

export default AboutStaking;
