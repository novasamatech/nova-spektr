import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { FootnoteText } from '../Typography';

type Props = {
  url?: string;
  showIcon?: boolean;
  iconName?: IconNames;
};
const InfoLink = ({ url, showIcon = true, children, iconName = 'info' }: PropsWithChildren<Props>) => (
  <FootnoteText
    className={cn(
      'w-max outline-offset-4 text-action-text-default hover:text-action-text',
      showIcon && 'flex items-center gap-x-1',
    )}
    fontWeight="semibold"
  >
    {url ? (
      <a href={url} rel="noopener noreferrer" target="_blank" className="text-inherit">
        {children}
      </a>
    ) : (
      children
    )}
    {showIcon && <Icon name={iconName} size={14} />}
  </FootnoteText>
);

export default InfoLink;
