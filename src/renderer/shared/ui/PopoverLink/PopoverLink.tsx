import { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { IconNames } from '../Icon/data';

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
}: PropsWithChildren<Props>) => (
  <span
    className={cnTw(
      'text-action-text-default hover:text-action-text cursor-pointer',
      fontClass,
      showIcon && 'flex items-center gap-x-1',
      className,
    )}
  >
    {showIcon && <Icon name={iconName} size={16} />}
    {children}
  </span>
);

export default PopoverLink;
