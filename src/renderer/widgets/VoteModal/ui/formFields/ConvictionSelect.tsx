import { type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Slider } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';

type Props = {
  value: Conviction;
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

export const ConvictionSelect = ({ value, disabled, onChange }: Props) => {
  const { t } = useI18n();

  const numericValue = Math.max(convictionList.indexOf(value), 0);

  const handleChange = (index: number) => {
    onChange(convictionList.at(index) ?? 'None');
  };

  return (
    <div className="group flex flex-col gap-3">
      <FootnoteText className="text-text-tertiary">{t('governance.vote.field.conviction')}</FootnoteText>
      <Slider
        value={numericValue}
        min={0}
        max={convictionList.length - 1}
        renderLabel={renderLabel}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
};
