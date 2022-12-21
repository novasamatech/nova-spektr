import { Fragment, PropsWithChildren, ReactNode } from 'react';
import cn from 'classnames';
import { Transition } from '@headlessui/react';

import useToggle from '@renderer/hooks/useToggle';
import { Button, Icon } from '@renderer/components/ui';

type Props = {
  item: ReactNode;
  defaultActive?: boolean;
  itemClassName?: string;
  className?: string;
  alwaysActive?: boolean;
};

const Expandable = ({
  item,
  defaultActive = true,
  alwaysActive = false,
  className,
  itemClassName,
  children,
}: PropsWithChildren<Props>) => {
  const [isActive, toggleIsActive] = useToggle(defaultActive);

  return (
    <div className={cn(className)}>
      <div className={cn('flex justify-between items-center', itemClassName)}>
        {item}
        <Button
          pallet="shade"
          variant="text"
          className="max-h-5 px-0"
          onClick={() => !alwaysActive && toggleIsActive()}
        >
          <Icon name={isActive || alwaysActive ? 'down' : 'up'} size={20} />
        </Button>
      </div>

      <Transition
        show={isActive || alwaysActive}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-0"
        enterTo="opacity-100 translate-y-1"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-1"
        leaveTo="opacity-0 translate-y-0"
      >
        {children}
      </Transition>
    </div>
  );
};

export default Expandable;
