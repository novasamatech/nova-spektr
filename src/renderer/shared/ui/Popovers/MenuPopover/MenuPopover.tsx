import { Menu } from '@headlessui/react';
import { type MouseEvent, type PropsWithChildren, type ReactNode, useRef } from 'react';

import { cnTw } from '@shared/lib/utils';

export type Props = {
  content: ReactNode; // for a11y features support use this popover with Menu.Item elements from headless ui
  className?: string;
  containerClassName?: string;
  buttonClassName?: string;
  offsetPx?: number;
  position?: string;
  closeOnClick?: boolean;
};

export const MenuPopover = ({
  content,
  className,
  containerClassName,
  buttonClassName,
  children,
  offsetPx = 7,
  position = 'left-0 top-full',
  closeOnClick = false,
}: PropsWithChildren<Props>) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const onMenuClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setTimeout(() => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <Menu>
      {({ open, close }) => (
        <div className={cnTw('relative', open && 'z-20', containerClassName)}>
          <Menu.Button className={cnTw('flex items-center', buttonClassName)} onClick={onMenuClick}>
            {children}
          </Menu.Button>
          <Menu.Items
            ref={menuRef}
            style={{ marginTop: offsetPx + 'px' }}
            className={cnTw(
              'absolute z-10 rounded-md border border-token-container-border bg-token-container-background',
              'w-max px-3 py-4 shadow-card-shadow',
              position,
              className,
            )}
            onClick={() => closeOnClick && close()}
          >
            {content}
          </Menu.Items>
        </div>
      )}
    </Menu>
  );
};
