import { PropsWithChildren } from 'react';
import { Disclosure, Transition } from '@headlessui/react';

import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  isDefaultOpen?: boolean;
};

const Accordion = ({ isDefaultOpen, children }: PropsWithChildren<Props>) => {
  return (
    <div className="w-full">
      <Disclosure defaultOpen={isDefaultOpen}>{children}</Disclosure>
    </div>
  );
};

type ButtonProps = {
  className?: string;
};

const Button = ({ className, children }: PropsWithChildren<ButtonProps>) => {
  return (
    <Disclosure.Button className={cnTw('flex items-center justify-between w-full', className)}>
      {({ open }) => (
        <>
          {children}
          <Icon name={open ? 'up' : 'down'} className="ml-4" size={16} />
        </>
      )}
    </Disclosure.Button>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  return (
    <Transition
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Disclosure.Panel>{children}</Disclosure.Panel>
    </Transition>
  );
};

Accordion.Button = Button;
Accordion.Content = Content;

export default Accordion;
