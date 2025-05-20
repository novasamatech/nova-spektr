import { type ComponentProps, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { type IconNames } from '../Icon/data';

type Props = Pick<ComponentProps<'a'>, 'onClick'> & {
  url: string;
  iconName?: IconNames;
  size?: 'sm' | 'md' | 'inherit';
  iconPosition?: 'left' | 'right';
  className?: string;
  tabIndex?: number;
  download?: boolean;
  withLinkIcon?: boolean;
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
  onClick,
  withLinkIcon,
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
    onClick={onClick}
  >
    {iconPosition === 'left' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
    {children}
    {iconPosition === 'right' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
    {withLinkIcon && <Icon name="link" size={16} className="text-icon-default" />}
  </a>
);
