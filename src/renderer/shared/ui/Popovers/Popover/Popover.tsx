import { Popover as Popup, Transition } from '@headlessui/react';
import { AriaRole, Fragment, PropsWithChildren, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cnTw } from '@shared/lib/utils';
import { useDebounce } from '@shared/lib/hooks';
import { popoverUtils } from '../common/utils';

type Props = {
  content: ReactNode;
  offsetPx?: number;
  panelClass?: string;
  contentClass?: string;
  horizontalPos?: 'left' | 'center' | 'right';
  role?: AriaRole;
};

export const Popover = ({
  content,
  children,
  offsetPx = 10,
  panelClass,
  horizontalPos = 'right',
  contentClass,
  role,
}: PropsWithChildren<Props>) => {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // prevents modal flickering when just passing across popup button
  // and gives user more time to move cursor to Popup.Panel
  const debouncedIsOpen = useDebounce(isOpen, 100);
  const parentRect = ref.current?.getBoundingClientRect();
  const horizontalAlign = horizontalPos !== 'right' && {
    transform: `translateX(${horizontalPos === 'center' ? '-50%' : '-100%'})`,
  };

  useEffect(() => {
    const scrollableParent = popoverUtils.findScrollContainer(ref.current);

    if (debouncedIsOpen) {
      scrollableParent?.addEventListener('wheel', popoverUtils.blockScroll);
      scrollableParent?.addEventListener('touchmove', popoverUtils.blockScroll);
    } else {
      scrollableParent?.removeEventListener('wheel', popoverUtils.blockScroll);
      scrollableParent?.removeEventListener('touchmove', popoverUtils.blockScroll);
    }

    return () => {
      scrollableParent?.removeEventListener('wheel', popoverUtils.blockScroll);
      scrollableParent?.removeEventListener('touchmove', popoverUtils.blockScroll);
    };
  }, [debouncedIsOpen, ref.current]);

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
      {createPortal(
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
            as="div"
            id={id}
            style={
              parentRect && {
                top: `${parentRect.top + parentRect.height + offsetPx}px`,
                left: `${parentRect.left + parentRect.width / 2}px`,
                ...horizontalAlign,
              }
            }
            className={cnTw(
              'absolute z-[60] rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow',
              panelClass,
            )}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className={cnTw('relative', contentClass)}>{content}</div>
          </Popup.Panel>
        </Transition>,
        document.body,
      )}
    </Popup>
  );
};
