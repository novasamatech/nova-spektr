import { forwardRef } from 'react';
import cn from 'classnames';

import { Props as InputProps, Input } from '../Input/Input';
import { Icon } from '../../Icon/Icon';
import { ButtonIcon } from '../../Buttons';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

export const InputSearch = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={className}
    prefixElement={<Icon name="search" size={20} />}
    suffixElement={
      <ButtonIcon
        icon="close"
        ariaLabel="clear search"
        className={cn(!props.value && 'invisible')}
        onClick={() => props.onChange?.('')}
      />
    }
    {...props}
  />
));
