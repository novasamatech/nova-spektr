import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Icon } from '@renderer/components/ui';
import { FocusControl } from '@renderer/components/ui-redesign/Dropdowns/common/types';

interface BaseProps extends FocusControl {
  url?: string;
  showIcon?: boolean;
  iconName?: IconNames;
  className?: string;
  fontClass?: string;
}

type ExternalLink = Required<Pick<BaseProps, 'url'>> & Omit<BaseProps, 'url'>;
type PopoverLink = Required<Pick<BaseProps, 'showIcon'>> & Omit<BaseProps, 'showIcon'>;

// This component intended to be used either as external link or icon + text for popover anchor,
// so I tried to emphasize via types that either url or showIcon must be present

const InfoLink = ({
  url,
  showIcon,
  children,
  iconName = 'info',
  className,
  fontClass = 'text-footnote',
  tabIndex,
}: PropsWithChildren<ExternalLink | PopoverLink>) => {
  return (
    <a
      {...(url ? { href: url, rel: 'noopener noreferrer', target: '_blank' } : {})}
      className={cn(
        'text-action-text-default hover:text-action-text cursor-pointer',
        fontClass,
        showIcon && 'flex items-center gap-x-1',
        className,
      )}
      tabIndex={tabIndex}
    >
      {showIcon && <Icon name={iconName} size={14} />}
      {children}
    </a>
  );
};

export default InfoLink;
