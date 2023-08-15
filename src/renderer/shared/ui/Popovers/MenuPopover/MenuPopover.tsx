import { Menu } from '@headlessui/react';
import { PropsWithChildren, ReactNode, useRef, MouseEvent } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';

export type Props = {
  content: ReactNode; // for a11y features support use this popover with Menu.Item elements from headless ui
  className?: string;
  containerClassName?: string;
  buttonClassName?: string;
  offsetPx?: number;
  position?: string;
};

export const MenuPopover = ({
  content,
  className,
  containerClassName,
  buttonClassName,
  children,
  offsetPx = 7,
  position = 'left-0 top-full',
}: PropsWithChildren<Props>) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const onMenuClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTimeout(() => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <Menu>
      {({ open }) => (
        <div className={cnTw('relative', open && 'z-20', containerClassName)}>
          <Menu.Button className={cnTw('flex items-center', buttonClassName)} onClick={onMenuClick}>
            {children}
          </Menu.Button>
          <Menu.Items
            ref={menuRef}
            style={{ marginTop: offsetPx + 'px' }}
            className={cnTw(
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
};
