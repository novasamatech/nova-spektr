import { Popover as Popup, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, ReactNode, SyntheticEvent, useLayoutEffect, useRef, useState } from 'react';

export interface PopoverProps {
  content: ReactNode;
  offsetPx?: number;
  shownOnClick?: boolean;
}

const Popover = ({ content, children, offsetPx = 10, shownOnClick = false }: PropsWithChildren<PopoverProps>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(ref.current?.offsetHeight || 0);
  }, []);

  const onHoverProps = {
    onFocus: () => setIsOpen(true),
    onBlur: () => setIsOpen(false),
    onMouseEnter: () => setIsOpen(true),
    onMouseLeave: () => setIsOpen(false),
  };

  const openOnClick = (e: SyntheticEvent) => {
    setIsOpen(true);
    e.stopPropagation();

    const closeOnClickOutside = (e: MouseEvent) => {
      if (!(e.target && document.getElementById('popup')?.contains(e.target as Node))) {
        setIsOpen(false);
        window.removeEventListener('click', closeOnClickOutside);
      }
    };

    window.addEventListener('click', closeOnClickOutside);
  };

  return (
    <Popup className="relative">
      {height && (
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
            id="popup"
            style={{ top: height + offsetPx + 'px' }}
            className="absolute z-20 w-[275px] rounded-2lg bg-white border border-shade-10 shadow-surface"
          >
            <div className="relative">{content}</div>
          </Popup.Panel>
        </Transition>
      )}
      <div ref={ref} tabIndex={0} {...(shownOnClick ? { onClick: openOnClick } : onHoverProps)}>
        {children}
      </div>
    </Popup>
  );
};

export default Popover;
