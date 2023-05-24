import { forwardRef } from 'react';

import { Icon } from '@renderer/components/ui';
import { Input } from '@renderer/components/ui-redesign';
import { Props as InputProps } from '@renderer/components/ui-redesign/Inputs/Input/Input';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = Omit<InputProps, 'prefixElement'>;

const SearchInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
  <Input
    prefixElement={<Icon name="search" size={16} className="mr-2" />}
    className={cnTw('pl-9', className)}
    {...props}
  />
));

export default SearchInput;
