import { memo } from 'react';

import { Input } from '@/shared/ui-kit';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const NumberParamInput = memo(({ value, onChange, placeholder }: Props) => {
  const handleChange = (val: string) => {
    // Allow empty, digits, and negative sign for signed ints
    if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
      onChange(val);
    }
  };

  return <Input height="sm" value={value} placeholder={placeholder ?? '0'} onChange={handleChange} />;
});
