import { forwardRef } from 'react';
import cn from 'classnames';

import { Icon, IconButton, Input } from '@renderer/shared/ui';
import { Props as InputProps } from '../Input/Input';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

export const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={className}
    prefixElement={<Icon name="search" size={20} />}
    suffixElement={
      <IconButton
        name="close"
        ariaLabel="clear search"
        className={cn(!props.value && 'invisible')}
        onClick={() => props.onChange?.('')}
      />
    }
    {...props}
  />
));
