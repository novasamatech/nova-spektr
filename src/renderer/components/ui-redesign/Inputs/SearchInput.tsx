import { forwardRef } from 'react';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { IconButton, Input } from '@renderer/components/ui-redesign';
import { Props as InputProps } from '@renderer/components/ui-redesign/Inputs/Input/Input';

type Props = Omit<InputProps, 'prefixElement' | 'suffixElement'>;

const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
  <Input
    className={className}
    prefixElement={<Icon name="search" size={16} className="mr-2" />}
    suffixElement={
      <IconButton
        name="close"
        ariaLabel="clear search"
        className={cn('ml-2 p-[1px]', !props.value && 'hidden')}
        onClick={() => props.onChange && props.onChange('')}
      />
    }
    {...props}
  />
));

export default SearchInput;
