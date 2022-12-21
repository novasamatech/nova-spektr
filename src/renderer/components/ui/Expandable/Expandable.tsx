import { PropsWithChildren, ReactNode } from 'react';
import cn from 'classnames';

import useToggle from '@renderer/hooks/useToggle';
import Button from '../Buttons/Button/Button';
import Icon from '../Icon/Icon';

type Props = {
  item: ReactNode;
  defaultActive?: boolean;
  itemClassName?: string;
  className?: string;
};

const Expandable = ({ item, defaultActive = true, className, itemClassName, children }: PropsWithChildren<Props>) => {
  const [isActive, toggleIsActive] = useToggle(defaultActive);

  return (
    <div className={cn(className)}>
      <div className={cn('flex justify-between items-center', itemClassName)}>
        {item}
        <Button pallet="shade" variant="text" className="max-h-5 px-0" onClick={() => toggleIsActive()}>
          <Icon name={isActive ? 'down' : 'up'} size={20} />
        </Button>
      </div>

      {isActive && children}
    </div>
  );
};

export default Expandable;
