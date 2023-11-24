import { PropsWithChildren, forwardRef } from 'react';
import { Disclosure, Transition } from '@headlessui/react';

import { Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

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
  onClick?: () => void;
};

const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(
  ({ buttonClass, iconWrapper, onClick, children }, ref) => {
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
                name={open ? 'up' : 'down'}
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
  className?: string;
};

const Content = ({ children, className }: PropsWithChildren<ContentProps>) => {
  return (
    <Transition
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Disclosure.Panel className={className}>{children}</Disclosure.Panel>
    </Transition>
  );
};

Accordion.Button = Button;
Accordion.Content = Content;

export default Accordion;
