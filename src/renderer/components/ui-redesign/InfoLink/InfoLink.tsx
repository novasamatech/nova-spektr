import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Icon } from '@renderer/components/ui';
import { ViewClass } from '@renderer/components/ui-redesign/Buttons/common/constants';

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
  fontClass = 'text-button-small font-semibold font-inter',
  tabIndex,
}: PropsWithChildren<Props>) => (
  <a
    href={url}
    rel="noopener noreferrer"
    target="_blank"
    tabIndex={tabIndex}
    className={cn(ViewClass['text_primary'], fontClass, showIcon && 'flex items-center gap-x-0.5', className)}
  >
    {showIcon && <Icon name={iconName} size={16} />}
    {children}
  </a>
);

export default InfoLink;
