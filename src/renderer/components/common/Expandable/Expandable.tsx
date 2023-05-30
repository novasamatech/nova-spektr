import { PropsWithChildren, ReactNode } from 'react';
import { Transition } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { useToggle } from '@renderer/shared/hooks';
import { Button, Icon } from '@renderer/components/ui';

type Props = {
  item?: ReactNode;
  defaultActive?: boolean;
  itemClass?: string;
  wrapperClass?: string;
  alwaysActive?: boolean;
  full?: boolean;
};

const Expandable = ({
  item,
  defaultActive = true,
  alwaysActive = false,
  full = false,
  wrapperClass,
  itemClass,
  children,
}: PropsWithChildren<Props>) => {
  const [isActive, toggleIsActive] = useToggle(defaultActive);

  return (
    <div className={wrapperClass}>
      {full ? (
        <Button
          pallet="shade"
          variant="text"
          className={cnTw('w-full', itemClass)}
          suffixElement={<Icon name={isActive || alwaysActive ? 'down' : 'up'} size={20} />}
          onClick={() => !alwaysActive && toggleIsActive()}
        >
          {item}
        </Button>
      ) : (
        <div className={cnTw('flex justify-between items-center', itemClass)}>
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
      )}

      <Transition
        as="div"
        show={isActive || alwaysActive}
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
