import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Duration, Shimmering, FootnoteText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Asset } from '@renderer/entities/asset/model/asset';
import { EraIndex } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { useStakingData } from '@renderer/entities/staking/lib/stakingDataService';
import { BalanceNew } from '@renderer/entities/asset';

type Props = {
  api?: ApiPromise;
  era?: EraIndex;
  asset?: Asset;
  validators: Validator[];
};

// const apyToMonthlyRate = (apy: number) => {
//   const monthly = Math.pow(1 + apy / 100, 1 / 12) - 1;
//
//   return (monthly * 100).toFixed(2);
// };

export const AboutStaking = ({ api, era, asset, validators }: Props) => {
  const { t } = useI18n();

  const { getMinNominatorBond, getUnbondingPeriod, getTotalStaked } = useStakingData();

  const [minimumStake, setMinimumStake] = useState('');
  const [unstakingPeriod, setUnstakingPeriod] = useState('');
  const [totalStaked, setTotalStaked] = useState('');
  // const [averageApy, setAverageApy] = useState('');

  useEffect(() => {
    if (!api?.isConnected) return;

    getMinNominatorBond(api).then(setMinimumStake);
    setUnstakingPeriod(getUnbondingPeriod(api));

    return () => {
      setMinimumStake('');
      setUnstakingPeriod('');
    };
  }, [api]);

  useEffect(() => {
    if (!api?.isConnected || !era) return;

    // getAvgApy(api, validators).then(setAverageApy);
    getTotalStaked(api, era).then(setTotalStaked);

    return () => {
      // setAverageApy('');
      setTotalStaked('');
    };
  }, [api, era, validators.length]);

  // TODO: temporary disabled
  // const activeNominatorsAmount = useMemo(() => {
  //   const nominatorsAddresses = validators.reduce<Address[]>((acc, { nominators }) => {
  //     nominators.forEach(({ who }) => acc.push(who));
  //
  //     return acc;
  //   }, []);
  //
  //   return new Set(nominatorsAddresses).size;
  // }, [validators.length]);

  // const maximumApy = validators.reduce((acc, validator) => Math.max(acc, validator.apy), 0);

  return (
    <div className="flex flex-col gap-y-6">
      <FootnoteText className="text-text-secondary">
        <Trans t={t} i18nKey="staking.about.aboutStakingTitle" values={{ asset: asset?.symbol }} />
      </FootnoteText>

      {/* TODO: APY calculation must be revisited */}
      {/*<div className="grid grid-cols-2 gap-x-4">*/}
      {/*<div className="rounded-md bg-block-background py-5 px-4">*/}
      {/*  <div className="grid grid-cols-2 auto-rows-min gap-x-7">*/}
      {/*    <FootnoteText>{t('staking.about.monthlyEarningLabel')}</FootnoteText>*/}
      {/*    <FootnoteText>{t('staking.about.yearlyEarningLabel')}</FootnoteText>*/}

      {/*    {maximumApy ? (*/}
      {/*      <LargeTitleText as="p">{apyToMonthlyRate(maximumApy)}%</LargeTitleText>*/}
      {/*    ) : (*/}
      {/*      <Shimmering width={96} height={36} />*/}
      {/*    )}*/}
      {/*    {maximumApy ? <LargeTitleText as="p">{maximumApy}%</LargeTitleText> : <Shimmering width={96} height={36} />}*/}
      {/*  </div>*/}

      {/*  <hr className="border-divider my-2" />*/}

      {/*  <div className="grid grid-cols-2 auto-rows-min gap-x-7">*/}
      {/*    <FootnoteText className="text-text-secondary">{t('staking.about.maximumApyLabel')}</FootnoteText>*/}
      {/*    <FootnoteText className="text-text-secondary">{t('staking.about.averageApyLabel')}</FootnoteText>*/}

      {/*    {maximumApy ? <TitleText>{maximumApy}%</TitleText> : <Shimmering width={96} height={30} />}*/}
      {/*    {averageApy ? <TitleText>{averageApy}%</TitleText> : <Shimmering width={96} height={30} />}*/}
      {/*  </div>*/}
      {/*</div>*/}

      <div className="grid grid-cols-2 gap-y-3 gap-x-6">
        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.totalStakedLabel')}</FootnoteText>
          {totalStaked && asset ? (
            <BalanceNew value={totalStaked} asset={asset} className="text-footnote text-right" />
          ) : (
            <Shimmering className="justify-self-end" width={100} height={18} />
          )}
        </div>

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.minimumStakeLabel')}</FootnoteText>
          {minimumStake && asset ? (
            <BalanceNew value={minimumStake} asset={asset} className="text-footnote text-right" />
          ) : (
            <Shimmering className="justify-self-end" width={100} height={18} />
          )}
        </div>

        {/*<div className="flex justify-between gap-x-1">*/}
        {/*  <FootnoteText className="text-text-secondary">{t('staking.about.activeNominatorsLabel')}</FootnoteText>*/}
        {/*  {activeNominatorsAmount ? (*/}
        {/*    <FootnoteText align="right">{activeNominatorsAmount}</FootnoteText>*/}
        {/*  ) : (*/}
        {/*    <Shimmering className="justify-self-end" width={100} height={18} />*/}
        {/*  )}*/}
        {/*</div>*/}

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.stakingPeriodLabel')}</FootnoteText>
          {unstakingPeriod ? (
            <FootnoteText align="right">{t('staking.about.unlimitedLabel')}</FootnoteText>
          ) : (
            <Shimmering className="justify-self-end" width={100} height={18} />
          )}
        </div>

        <div className="flex justify-between gap-x-1">
          <FootnoteText className="text-text-secondary">{t('staking.about.unstakingPeriodLabel')}</FootnoteText>
          {unstakingPeriod ? (
            <FootnoteText align="right">
              <Duration seconds={unstakingPeriod} />
            </FootnoteText>
          ) : (
            <Shimmering className="justify-self-end" width={100} height={18} />
          )}
        </div>
      </div>
    </div>
  );
};
