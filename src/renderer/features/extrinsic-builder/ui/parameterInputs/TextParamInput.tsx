import { memo } from 'react';

import { Input } from '@/shared/ui-kit';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const TextParamInput = memo(({ value, onChange, placeholder }: Props) => {
  return <Input height="sm" value={value} placeholder={placeholder ?? '0x...'} onChange={onChange} />;
});
