import { Popover, Transition } from '@headlessui/react';
import { PropsWithChildren, ReactNode, MouseEvent, useRef, Fragment, KeyboardEvent } from 'react';

import { cnTw, KeyboardKey } from '@shared/lib/utils';
import { FootnoteText } from '../Typography';

type Props = {
  button: ReactNode;
  className?: string;
};

const ContextMenuRoot = ({ button, children, className }: PropsWithChildren<Props>) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const onButtonClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setTimeout(() => {
      popoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 70);
  };

  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.code === KeyboardKey.SPACE || e.code === KeyboardKey.ENTER) {
      e.stopPropagation();
      setTimeout(() => {
        popoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 70);
    }
  };

  return (
    <Popover className="relative w-full">
      <Popover.Button as="div" onClick={onButtonClick} onKeyUp={onKeyUp}>
        {button}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel
          ref={popoverRef}
          className={cnTw(
            'absolute right-0 z-10 -mt-3 py-4 px-2.5 rounded-md w-[230px]',
            'bg-token-container-background border border-token-container-border shadow-card-shadow',
            className,
          )}
        >
          {children}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

type GroupProps = {
  title?: string;
  active?: boolean;
};
const ContextGroup = ({ title, active = true, children }: PropsWithChildren<GroupProps>) => {
  if (!active) return null;

  return (
    <div className="pb-2 mb-2 border-b border-divider last:pb-0 last:mb-0 last:border-b-0">
      {title && <FootnoteText className="text-text-tertiary pb-[2px]">{title}</FootnoteText>}
      {children}
    </div>
  );
};

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Group: ContextGroup,
});
