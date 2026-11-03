import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { validateDecimals, validateSymbols } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Box, Input } from '@/shared/ui-kit';
import { type AmountUnit, toBaseUnits } from '../../lib/amountUnit';

type Props = {
  value: string;
  /**
   * Null when the amount's unit is not known — the value is then entered in
   * whole base units
   */
  unit: AmountUnit | null;
  onChange: (value: string) => void;
};

export const BalanceParamInput = memo(({ value, unit, onChange }: Props) => {
  const { t } = useI18n();

  const handleChange = (val: string) => {
    // Refuse the keystroke rather than let encoding fail later on excess decimals
    const isValid = unit ? validateSymbols(val) && validateDecimals(val, unit.precision) : /^\d*$/.test(val);

    if (isValid) {
      onChange(val);
    }
  };

  // The exact integer that goes into the call data
  const baseUnits = useMemo(() => {
    if (!unit || value === '') return null;

    try {
      return toBaseUnits(value, unit);
    } catch {
      return null;
    }
  }, [value, unit]);

  const suffixElement = (
    <FootnoteText className="whitespace-nowrap text-text-tertiary">
      {unit ? unit.symbol : t('extrinsicBuilder.baseUnits')}
    </FootnoteText>
  );

  return (
    <Box direction="column" gap={1}>
      <Input
        height="sm"
        value={value}
        placeholder={unit ? '0.0' : '0'}
        suffixElement={suffixElement}
        onChange={handleChange}
      />
      {baseUnits !== null && (
        <FootnoteText className="text-text-tertiary">
          {t('extrinsicBuilder.baseUnitsPreview', { amount: baseUnits })}
        </FootnoteText>
      )}
    </Box>
  );
});
