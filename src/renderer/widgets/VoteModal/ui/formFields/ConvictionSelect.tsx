import { type BN } from '@polkadot/util';

import { useI18n } from '@app/providers';
import { type Asset, type Conviction } from '@shared/core';
import { formatBalance, toNumberWithPrecision } from '@shared/lib/utils';
import { FootnoteText, Slider, TitleText } from '@shared/ui';
import { votingService } from '@entities/governance';

type Props = {
  value: Conviction;
  amount: BN;
  asset: Asset;
  onChange: (value: Conviction) => void;
};

const convictionColors = [
  'text-text-conviction-slider-text-01',
  'text-text-conviction-slider-text-1',
  'text-text-conviction-slider-text-2',
  'text-text-conviction-slider-text-3',
  'text-text-conviction-slider-text-4',
  'text-text-conviction-slider-text-5',
  'text-text-conviction-slider-text-6',
];

const convictionList = votingService.getConvictionList();

const renderLabel = (value: number) => (
  <FootnoteText className={convictionColors[value]}>
    {/* eslint-disable-next-line i18next/no-literal-string */}
    {votingService.getConvictionMultiplier(convictionList[value] ?? 'None')}x
  </FootnoteText>
);

export const ConvictionSelect = ({ value, asset, amount, onChange }: Props) => {
  const { t } = useI18n();

  const numericValue = Math.max(convictionList.indexOf(value), 0);
  const votingPower = votingService.calculateVotingPower(amount, value);

  const handleChange = (index: number) => {
    onChange(convictionList.at(index) ?? 'None');
  };

  return (
    <div className="flex flex-col gap-3">
      <FootnoteText className="text-text-tertiary">{t('governance.vote.field.conviction')}</FootnoteText>
      <Slider
        value={numericValue}
        min={0}
        max={convictionList.length - 1}
        renderLabel={renderLabel}
        onChange={handleChange}
      />
      <div className="flex justify-center">
        <TitleText className="text-text-tertiary">
          {t('governance.referendum.votes', {
            votes: formatBalance(votingPower, asset.precision).formatted,
            count: toNumberWithPrecision(votingPower, asset.precision),
          })}
        </TitleText>
      </div>
    </div>
  );
};
