/* eslint-disable i18next/no-literal-string */
import { Popover as Popup, Transition } from '@headlessui/react';
import { type AriaRole, Fragment, type PropsWithChildren, type ReactNode, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useDebounce } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { useTheme } from '@/shared/ui-kit/Theme/useTheme';
import { type Horizontal, type Vertical } from '../common/types';
import { useParentScrollLock } from '../common/useParentScrollLock';

const TranslateX: Record<Horizontal, string> = {
  left: '-translate-x-full',
  center: '-translate-x-1/2',
  right: 'translate-x-0',
};
const TranslateY: Record<Vertical, string> = {
  up: '-translate-y-full',
  down: '-translate-y-0',
};

type Props = {
  content: ReactNode;
  offsetPx?: number;
  panelClass?: string;
  contentClass?: string;
  wrapperClass?: string;
  horizontal?: Horizontal;
  vertical?: Vertical;
  role?: AriaRole;
  tabIndex?: number;
};

/**
 * @deprecated Use `import { Popover } from '@/shared/ui-kit'` instead.
 */
export const Popover = ({
  content,
  offsetPx = 10,
  panelClass,
  horizontal = 'center',
  vertical = 'down',
  contentClass,
  wrapperClass,
  role,
  tabIndex = 0,
  children,
}: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();

  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // prevents modal flickering when just passing across popup button
  // and gives user more time to move cursor to Popup.Panel
  const debouncedIsOpen = useDebounce(isOpen, 100);
  useParentScrollLock(debouncedIsOpen, ref.current);

  const getPanelPosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return {};
    }

    return {
      top: vertical === 'up' ? `${rect.top - offsetPx}px` : `${rect.top + rect.height + offsetPx}px`,
      left: `${rect.left + rect.width / 2}px`,
    };
  };

  return (
    <Popup className={cnTw('relative', wrapperClass)} role={role}>
      <div
        ref={ref}
        tabIndex={tabIndex}
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
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Popup.Panel
            as="div"
            id={id}
            style={getPanelPosition()}
            className={cnTw(
              'absolute z-[60] rounded-md bg-token-container-background',
              'border border-token-container-border shadow-card-shadow',
              TranslateX[horizontal],
              TranslateY[vertical],
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
        portalContainer ?? document.body,
      )}
    </Popup>
  );
};
