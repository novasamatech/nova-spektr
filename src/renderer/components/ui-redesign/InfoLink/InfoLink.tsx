import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { Icon } from '@renderer/components/ui';

type Props = {
  url: string;
  showIcon?: boolean;
  iconName?: IconNames;
  size?: 'sm' | 'md';
  className?: string;
  tabIndex?: number;
};

const InfoLink = ({ url, children, iconName, size = 'sm', className, tabIndex }: PropsWithChildren<Props>) => (
  <a
    href={url}
    rel="noopener noreferrer"
    target="_blank"
    tabIndex={tabIndex}
    className={cnTw(
      'text-primary-button-background-default hover:text-primary-button-background-hover active:text-primary-button-background-active disabled:text-primary-button-background-inactive',
      size === 'sm' ? 'text-button-small' : 'text-button-large',
      iconName && 'flex items-center gap-x-0.5',
      className,
    )}
  >
    {iconName && <Icon name={iconName} size={16} />}
    {children}
  </a>
);

export default InfoLink;
