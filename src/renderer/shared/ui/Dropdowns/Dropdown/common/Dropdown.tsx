import cn from 'classnames';
import { Menu } from '@headlessui/react';
import { ComponentProps, ReactNode } from 'react';

import { DropdownOptions } from './DropdownOptions';

type DropdownOptionsProps = ComponentProps<typeof DropdownOptions>;
type Props = { button: (open: boolean) => ReactNode } & DropdownOptionsProps;

export const Dropdown = ({ button, ...optionsProps }: Props) => (
  <Menu>
    {({ open }) => (
      <div className={cn('relative', open && 'z-10')}>
        {button(open)}
        <DropdownOptions {...optionsProps} />
      </div>
    )}
  </Menu>
);
