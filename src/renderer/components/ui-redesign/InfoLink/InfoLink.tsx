import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
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
    className={cnTw(ViewClass['text_primary'], fontClass, showIcon && 'flex items-center gap-x-1', className)}
  >
    {showIcon && <Icon name={iconName} size={14} />}
    {children}
  </a>
);

export default InfoLink;
