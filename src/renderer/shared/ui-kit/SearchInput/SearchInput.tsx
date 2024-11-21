import { forwardRef } from 'react';

import { Icon, IconButton } from '@/shared/ui';
import { Input, type InputProps } from '../Input/Input';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

export const SearchInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return (
    <Input
      ref={ref}
      type="search"
      prefixElement={<Icon name="search" size={16} />}
      suffixElement={Boolean(props.value) && <IconButton name="close" onClick={() => props.onChange?.('')} />}
      {...props}
    />
  );
});
