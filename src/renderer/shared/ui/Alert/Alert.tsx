import { Children, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { IconButton } from '../Buttons';
import { Icon } from '../Icon/Icon';
import { HeadlineText } from '../Typography';

import { AlertItem } from './AlertItem';
import { IconName, IconStyle, ViewStyle } from './common/constants';
import { type Variant } from './common/types';

type Props = {
  title: string;
  active: boolean;
  variant?: Variant;
  className?: string;
  onClose?: () => void;
};

const AlertRoot = ({ title, active, variant = 'info', className, children, onClose }: PropsWithChildren<Props>) => {
  if (!active) {
    return null;
  }

  const isList = Children.toArray(children).length > 0;

  return (
    <div className={cnTw('w-full rounded-lg border p-[15px]', ViewStyle[variant])}>
      <div className="flex items-start gap-x-1.5">
        <div className="flex max-w-full flex-1 flex-col gap-y-1">
          <div className="flex items-center gap-x-1.5">
            <Icon name={IconName[variant]} size={14} className={IconStyle[variant]} />
            <HeadlineText>{title}</HeadlineText>
          </div>
          {isList ? <ul className={cnTw('flex list-none flex-col gap-y-1 pl-5', className)}>{children}</ul> : children}
        </div>

        {onClose && <IconButton size={14} name="close" onClick={onClose} />}
      </div>
    </div>
  );
};

export const Alert = Object.assign(AlertRoot, {
  Item: AlertItem,
});
