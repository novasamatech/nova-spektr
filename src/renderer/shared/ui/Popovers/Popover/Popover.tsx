import { Popover as Popup, Transition } from '@headlessui/react';
import { AriaRole, Fragment, PropsWithChildren, ReactNode, useId, useRef, useState } from 'react';

import { cnTw } from '@shared/lib/utils';
import { useDebounce } from '@shared/lib/hooks';

type Props = {
  content: ReactNode;
  offsetPx?: number;
  panelClass?: string;
  contentClass?: string;
  role?: AriaRole;
};

export const Popover = ({
  content,
  children,
  offsetPx = 10,
  panelClass = 'left-0 top-full',
  contentClass,
  role,
}: PropsWithChildren<Props>) => {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // prevents modal flickering when just passing across popup button
  // and gives user more time to move cursor to Popup.Panel
  const debouncedIsOpen = useDebounce(isOpen, 200);

  return (
    <Popup className="relative" role={role}>
      <div
        className="w-fit"
        ref={ref}
        tabIndex={0}
        aria-details={id}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
      <Transition
        show={debouncedIsOpen}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popup.Panel
          id={id}
          style={{ marginTop: offsetPx + 'px' }}
          className={cnTw(
            'absolute z-20 rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow',
            panelClass,
          )}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className={cnTw('relative', contentClass)}>{content}</div>
        </Popup.Panel>
      </Transition>
    </Popup>
  );
};
