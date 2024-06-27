import { PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { IconNames } from '../Icon/data';
import { Icon } from '../Icon/Icon';

type Props = {
  url: string;
  iconName?: IconNames;
  size?: 'sm' | 'md' | 'inherit';
  iconPosition?: 'left' | 'right';
  className?: string;
  tabIndex?: number;
  download?: boolean;
};

export const InfoLink = ({
  url,
  children,
  iconName,
  size = 'sm',
  className,
  iconPosition = 'left',
  tabIndex,
  download,
}: PropsWithChildren<Props>) => (
  <a
    href={url}
    rel="noopener noreferrer"
    target={download ? '_self' : '_blank'}
    tabIndex={tabIndex}
    className={cnTw(
      'text-primary-button-background-default hover:text-primary-button-background-hover active:text-primary-button-background-active disabled:text-primary-button-background-inactive',
      iconName && 'flex items-center gap-x-1',
      {
        'text-button-small': size === 'sm',
        'text-button-large': size === 'md',
        'text-inherit': size === 'inherit',
      },
      className,
    )}
    download={download}
  >
    {iconPosition === 'left' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
    {children}
    {iconPosition === 'right' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
  </a>
);
