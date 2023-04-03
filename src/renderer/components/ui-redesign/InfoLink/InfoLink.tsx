import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';
import { IconNames } from '@renderer/components/ui/Icon/data';

type Props = {
  url?: string;
  showIcon?: boolean;
  iconName?: IconNames;
};
const InfoLink = ({ url, showIcon = true, children, iconName = 'info' }: PropsWithChildren<Props>) => (
  <CalloutText
    className={cn('w-max outline-offset-4 text-redesign-system-blue', showIcon && 'flex items-center gap-x-1')}
    fontWeight="semibold"
  >
    <>
      {url ? (
        <a href={url} rel="noopener noreferrer" target="_blank" className="text-inherit">
          {children}
        </a>
      ) : (
        children
      )}
      {showIcon && <Icon name={iconName} size={14} />}
    </>
  </CalloutText>
);

export default InfoLink;
