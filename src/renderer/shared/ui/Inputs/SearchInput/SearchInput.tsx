import { forwardRef } from 'react';
import cn from 'classnames';

import { Icon, IconButton, Input } from '@shared/ui';
import { type Props as InputProps } from '../Input/Input';
import { cnTw } from '@shared/lib/utils';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

export const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, wrapperClass, ...props }, ref) => (
  <Input
    ref={ref}
    className={className}
    wrapperClass={cnTw('hover:shadow-none', wrapperClass)}
    prefixElement={<Icon name="search" size={16} className="mr-2" />}
    suffixElement={
      <IconButton
        name="close"
        ariaLabel="clear search"
        className={cn('ml-2 p-[1px]', !props.value && 'hidden')}
        onClick={() => props.onChange?.('')}
      />
    }
    {...props}
  />
));
