import React, { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { IconNames } from '@renderer/shared/ui/Icon/data';
import { Icon } from '@renderer/shared/ui';

type AnchorProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

type Props = {
  url: string;
  iconName?: IconNames;
  size?: 'sm' | 'md';
  iconPosition?: 'left' | 'right';
  className?: string;
  tabIndex?: number;
} & AnchorProps;

const InfoLink = ({
  url,
  children,
  iconName,
  size = 'sm',
  className,
  iconPosition = 'left',
  tabIndex,
  ...anchorProps
}: PropsWithChildren<Props>) => (
  <a
    href={url}
    rel="noopener noreferrer"
    target="_blank"
    tabIndex={tabIndex}
    className={cnTw(
      'text-primary-button-background-default hover:text-primary-button-background-hover active:text-primary-button-background-active disabled:text-primary-button-background-inactive',
      size === 'sm' ? 'text-button-small' : 'text-button-large',
      iconName && 'flex items-center gap-x-1',
      className,
    )}
    {...anchorProps}
  >
    {iconPosition === 'left' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
    {children}
    {iconPosition === 'right' && iconName && <Icon name={iconName} size={16} className="text-inherit" />}
  </a>
);

export default InfoLink;
