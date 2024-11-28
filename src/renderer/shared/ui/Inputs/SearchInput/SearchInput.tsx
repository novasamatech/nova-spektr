import { forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '../../Buttons';
import { Icon } from '../../Icon/Icon';
import { Input, type Props as InputProps } from '../Input/Input';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

export const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, wrapperClass, ...props }, ref) => (
  <Input
    ref={ref}
    className={className}
    wrapperClass={cnTw('hover:shadow-none', wrapperClass)}
    prefixElement={
      <span className="mr-2 h-fit w-fit">
        <Icon name="search" size={16} />
      </span>
    }
    suffixElement={
      <IconButton
        name="close"
        ariaLabel="clear search"
        className={cnTw('ml-2 p-[1px]', !props.value && 'hidden')}
        onClick={() => props.onChange?.('')}
      />
    }
    {...props}
  />
));
