import { Menu } from '@headlessui/react';
import { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  className?: string;
};

export const ButtonDropdownItem = ({ className, children }: PropsWithChildren<Props>) => (
  <Menu.Item as="li" className={cnTw('mb-1 last:mb-0', className)}>
    {children}
  </Menu.Item>
);
