import { PropsWithChildren } from 'react';
import { Disclosure, Transition } from '@headlessui/react';

import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

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
  className?: string;
};

const Button = ({ className, children }: PropsWithChildren<ButtonProps>) => {
  return (
    <Disclosure.Button className={cnTw('group flex items-center justify-between w-full gap-x-2', className)}>
      {({ open }) => (
        <>
          {children}
          <Icon
            name={open ? 'up' : 'down'}
            size={16}
            className={cnTw(
              'cursor-pointer rounded-full transition-colors',
              'group-focus:text-icon-hover group-focus:bg-hover',
              'group-hover:text-icon-hover group-hover:bg-hover',
            )}
          />
        </>
      )}
    </Disclosure.Button>
  );
};

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
