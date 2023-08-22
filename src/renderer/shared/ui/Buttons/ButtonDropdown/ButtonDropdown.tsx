import { Menu } from '@headlessui/react';
import { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Button } from '../Button/Button';
import { Icon } from '../../Icon/Icon';
import { ButtonDropdownItem } from './ButtonDropdownItem';

type Props = {
  title: string;
  disabled?: boolean;
  className?: string;
};

export const ButtonDropdown = ({ title, disabled, className, children }: PropsWithChildren<Props>) => (
  <Menu>
    {({ open }) => (
      <div className={cnTw('relative', open && 'z-10')}>
        <Menu.Button
          as={Button}
          disabled={disabled}
          suffixElement={<Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} className="text-text-white" />}
          className={cnTw('justify-center', className)}
        >
          {title}
        </Menu.Button>
        <Menu.Items
          as="ul"
          className="absolute w-full p-1 mt-1 z-10 rounded bg-bg-primary-default shadow-shadow-secondary"
        >
          {children}
        </Menu.Items>
      </div>
    )}
  </Menu>
);

ButtonDropdown.Item = ButtonDropdownItem;
