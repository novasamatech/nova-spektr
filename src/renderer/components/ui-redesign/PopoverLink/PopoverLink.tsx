import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Icon } from '@renderer/components/ui';

type Props = {
  showIcon?: boolean;
  iconName?: IconNames;
  className?: string;
  fontClass?: string;
};

const PopoverLink = ({
  showIcon,
  children,
  iconName = 'info',
  className,
  fontClass = 'text-footnote',
}: PropsWithChildren<Props>) => {
  return (
    <span
      className={cn(
        'text-action-text-default hover:text-action-text cursor-pointer',
        fontClass,
        showIcon && 'flex items-center gap-x-1',
        className,
      )}
    >
      {showIcon && <Icon name={iconName} size={14} />}
      {children}
    </span>
  );
};

export default PopoverLink;
