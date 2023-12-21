import { PropsWithChildren, forwardRef, ElementType } from 'react';
import { Disclosure, Transition } from '@headlessui/react';

import { Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { IconNames } from '../Icon/data';

type Props = {
  className?: string;
  isDefaultOpen?: boolean;
};

const Accordion = ({ className, isDefaultOpen, children }: PropsWithChildren<Props>) => {
  return (
    <div className={cnTw('w-full', className)}>
      <Disclosure defaultOpen={isDefaultOpen}>{children}</Disclosure>
    </div>
  );
};

type ButtonProps = {
  buttonClass?: string;
  iconWrapper?: string;
  iconOpened?: IconNames;
  iconClosed?: IconNames;
  onClick?: () => void;
};

const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(
  ({ buttonClass, iconWrapper, children, iconOpened, iconClosed, onClick }, ref) => {
    return (
      <Disclosure.Button
        ref={ref}
        className={cnTw('group flex items-center justify-between w-full gap-x-2', buttonClass)}
        onClick={onClick}
      >
        {({ open }) => (
          <>
            {children}
            <div className={cnTw('shrink-0', iconWrapper)}>
              <Icon
                name={open ? iconOpened || 'up' : iconClosed || 'down'}
                size={16}
                className={cnTw(
                  'cursor-pointer rounded-full transition-colors',
                  'group-hover:text-icon-hover group-hover:bg-hover',
                  'group-focus-visible:text-icon-hover group-focus-visible:bg-hover',
                )}
              />
            </div>
          </>
        )}
      </Disclosure.Button>
    );
  },
);

type ContentProps = {
  as?: ElementType;
  className?: string;
};

const Content = ({ as = 'div', className, children }: PropsWithChildren<ContentProps>) => {
  return (
    <Transition
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Disclosure.Panel as={as} className={className}>
        {children}
      </Disclosure.Panel>
    </Transition>
  );
};

Accordion.Button = Button;
Accordion.Content = Content;

export default Accordion;
