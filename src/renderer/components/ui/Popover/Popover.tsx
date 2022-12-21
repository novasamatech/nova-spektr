import { Popover as Popup, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, ReactNode, useState } from 'react';

import './Popover.css';

export interface PopoverProps {
  titleIcon?: ReactNode;
  titleText: string;
  content: string;
}

const Popover = ({ titleIcon, titleText, content, children }: PropsWithChildren<PopoverProps>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popup className="relative">
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
          className="absolute z-20 left-1/2 -translate-x-1/2 w-[275px] rounded-2lg bg-white
         border border-shade-10 shadow-surface bottom-[calc(100%+15px)]"
        >
          <div className="relative flex flex-col gap-y-1 p-4 arrow">
            <div className="flex items-center gap-x-1">
              {titleIcon}
              <p className="text-neutral text-sm font-semibold">{titleText}</p>
            </div>
            <p className="text-neutral-variant text-xs">{content}</p>
          </div>
        </Popup.Panel>
      </Transition>
      <div
        tabIndex={0}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
    </Popup>
  );
};

export default Popover;
