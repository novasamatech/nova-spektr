import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { FootnoteText } from '@/shared/ui';
import { Input } from '@/shared/ui-kit';
import { builderModel } from '../../model/builder';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const BalanceParamInput = memo(({ value, onChange }: Props) => {
  const api = useUnit(builderModel.$api);

  const { symbol } = useMemo(() => {
    if (!api) return { symbol: '' };

    return { symbol: api.registry.chainTokens[0] ?? '' };
  }, [api]);

  const handleChange = (val: string) => {
    // Allow empty, digits, dot, and negative
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const suffixElement = symbol ? (
    <FootnoteText className="whitespace-nowrap text-text-tertiary">{symbol}</FootnoteText>
  ) : undefined;

  return <Input height="sm" value={value} placeholder="0.0" suffixElement={suffixElement} onChange={handleChange} />;
});
