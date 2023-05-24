import { Menu } from '@headlessui/react';
import cn from 'classnames';
import { PropsWithChildren, ReactNode } from 'react';

export type Props = {
  content: ReactNode; // for a11y features support use this popover with Menu.Item elements from headless ui
  className?: string;
  buttonClassName?: string;
  offsetPx?: number;
  position?: string;
};

const MenuPopover = ({
  content,
  className,
  buttonClassName,
  children,
  offsetPx = 7,
  position = 'left-0 top-full',
}: PropsWithChildren<Props>) => (
  <Menu>
    {({ open }) => (
      <div className={cn('relative', open && 'z-10')}>
        <Menu.Button className={cn('flex items-center', buttonClassName)} onClick={(e) => e.stopPropagation()}>
          {children}
        </Menu.Button>
        <Menu.Items
          style={{ marginTop: offsetPx + 'px' }}
          className={cn(
            'bg-token-container-background z-10 absolute rounded-md border border-token-container-border',
            'shadow-card-shadow w-max py-4 px-3',
            position,
            className,
          )}
        >
          {content}
        </Menu.Items>
      </div>
    )}
  </Menu>
);

export default MenuPopover;
