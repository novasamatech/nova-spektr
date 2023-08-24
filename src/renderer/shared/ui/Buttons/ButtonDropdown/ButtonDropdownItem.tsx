import { Menu } from '@headlessui/react';
import { ReactNode } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  className?: string;
  children: ReactNode | ((active: boolean) => ReactNode);
  onClick: () => void;
};

export const ButtonDropdownItem = ({ className, onClick, children }: Props) => (
  <Menu.Item as="button" className={cnTw('w-full mb-1 last:mb-0', className)} onClick={onClick}>
    {({ active }) => {
      return typeof children === 'function' ? <>{children(active)}</> : <>{children}</>;
    }}
  </Menu.Item>
);
