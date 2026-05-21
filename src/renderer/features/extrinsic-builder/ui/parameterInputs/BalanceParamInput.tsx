import { type ApiPromise } from '@polkadot/api';
import { memo, useMemo } from 'react';

import { FootnoteText } from '@/shared/ui';
import { Input } from '@/shared/ui-kit';

type Props = {
  value: string;
  api: ApiPromise | null;
  onChange: (value: string) => void;
};

export const BalanceParamInput = memo(({ value, api, onChange }: Props) => {
  const symbol = useMemo(() => {
    if (!api) return '';

    return api.registry.chainTokens[0] ?? '';
  }, [api]);

  const handleChange = (val: string) => {
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const suffixElement = symbol ? (
    <FootnoteText className="whitespace-nowrap text-text-tertiary">{symbol}</FootnoteText>
  ) : undefined;

  return <Input height="sm" value={value} placeholder="0.0" suffixElement={suffixElement} onChange={handleChange} />;
});
