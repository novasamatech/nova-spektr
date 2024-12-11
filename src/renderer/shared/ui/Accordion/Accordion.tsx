import { Disclosure, Transition } from '@headlessui/react';
import { type ElementType, type PropsWithChildren, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { type IconNames } from '../Icon/data';

type Props = {
  className?: string;
  isDefaultOpen?: boolean;
};

const AccordionRoot = ({ className, isDefaultOpen, children }: PropsWithChildren<Props>) => {
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
        className={cnTw(
          'group flex w-full items-center justify-between gap-x-2 rounded hover:bg-action-background-hover',
          buttonClass,
        )}
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
                  'group-hover:text-icon-hover',
                  'group-focus-visible:text-icon-hover',
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

/**
 * @deprecated Use `import { Accordion } from '@/shared/ui-kit'` instead.
 */
export const Accordion = Object.assign(AccordionRoot, {
  Button,
  Content,
});
