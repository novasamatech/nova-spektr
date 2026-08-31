import { memo } from 'react';

import { Input } from '@/shared/ui-kit';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Allow a leading minus (signed ints only). */
  signed?: boolean;
};

export const NumberParamInput = memo(({ value, onChange, placeholder, signed = false }: Props) => {
  const handleChange = (val: string) => {
    const pattern = signed ? /^-?\d*$/ : /^\d*$/;
    if (pattern.test(val)) {
      onChange(val);
    }
  };

  return <Input height="sm" value={value} placeholder={placeholder ?? '0'} onChange={handleChange} />;
});
