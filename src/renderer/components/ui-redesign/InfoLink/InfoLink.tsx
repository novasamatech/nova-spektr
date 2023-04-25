import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Icon } from '@renderer/components/ui';

type Props = {
  url: string;
  showIcon?: boolean;
  iconName?: IconNames;
  className?: string;
  fontClass?: string;
  tabIndex?: number;
};

const InfoLink = ({
  url,
  showIcon,
  children,
  iconName = 'info',
  className,
  fontClass = 'text-footnote',
  tabIndex,
}: PropsWithChildren<Props>) => (
  <a
    href={url}
    rel="noopener noreferrer"
    target="_blank"
    tabIndex={tabIndex}
    className={cn(
      'text-action-text-default hover:text-action-text cursor-pointer',
      fontClass,
      showIcon && 'flex items-center gap-x-1',
      className,
    )}
  >
    {showIcon && <Icon name={iconName} size={14} />}
    {children}
  </a>
);

export default InfoLink;
