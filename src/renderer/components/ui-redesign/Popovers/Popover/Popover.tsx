import { Popover as Popup, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, ReactNode, useId, useRef, useState } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';

export type PopoverProps = {
  content: ReactNode;
  offsetPx?: number;
  contentClass?: string;
};

const Popover = ({ content, children, offsetPx = 10, contentClass }: PropsWithChildren<PopoverProps>) => {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popup className="relative">
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
        show={isOpen}
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
          style={{ top: '100%', marginTop: offsetPx + 'px' }}
          className="absolute z-20 rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow"
        >
          <div className={cnTw('relative w-[275px]', contentClass)}>{content}</div>
        </Popup.Panel>
      </Transition>
    </Popup>
  );
};

export default Popover;
