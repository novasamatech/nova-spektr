import { forwardRef } from 'react';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { IconButton, Input } from '@renderer/components/ui-redesign';
import { Props as InputProps } from '../Input/Input';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, wrapperClass, ...props }, ref) => (
  <Input
    ref={ref}
    className={className}
    wrapperClass={cnTw('hover:shadow-none', wrapperClass)}
    prefixElement={<Icon name="search" size={16} className="mr-2 text-icon-default" />}
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

export default SearchInput;
