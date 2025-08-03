import { type BN } from '@polkadot/util';

import { type Asset, type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Slider } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';

type Props = {
  amount?: BN;
  asset?: Asset;
  conviction: Conviction;
  disabled?: boolean;
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

export const ConvictionSelect = ({ conviction, asset, amount, disabled, onChange }: Props) => {
  const { t } = useI18n();

  const handleChange = (index: number) => {
    onChange(convictionList.at(index) ?? 'None');
  };

  return (
    <div className="group flex flex-col gap-3">
      <FootnoteText className="text-text-tertiary">{t('governance.vote.field.conviction')}</FootnoteText>
      <Slider
        min={0}
        max={convictionList.length - 1}
        value={Math.max(convictionList.indexOf(conviction), 0)}
        renderLabel={renderLabel}
        disabled={disabled}
        onChange={handleChange}
      />
      {nonNullable(asset) && nonNullable(amount) ? (
        <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.votingPower')}>
          <AssetBalance
            className="text-text-tertiary group-hover:text-text-primary transition-colors"
            value={votingService.calculateVotingPower(amount, conviction)}
            asset={asset}
          />
        </DetailRow>
      ) : null}
    </div>
  );
};
