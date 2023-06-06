import { PropsWithChildren, Children } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { IconButton, HeadlineText } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
import { Variant } from './common/types';
import { ViewStyle, IconStyle, IconName } from './common/constants';
import AlertItem from './AlertItem';

type Props = {
  title: string;
  variant?: Variant;
  className?: string;
  onClose?: () => void;
};

const Alert = ({ title, variant = 'info', className, children, onClose }: PropsWithChildren<Props>) => {
  const isList = Children.toArray(children).length > 0;

  return (
    <div className={cnTw('p-4 rounded-lg border', ViewStyle[variant])}>
      <div className="flex items-start gap-x-2">
        <div className="flex flex-col gap-y-1 flex-1">
          <div className="flex items-center gap-x-2">
            <Icon name={IconName[variant]} size={14} className={IconStyle[variant]} />
            <HeadlineText>{title}</HeadlineText>
          </div>
          {isList ? <ul className={cnTw('flex flex-col gap-y-1 list-none pl-6', className)}>{children}</ul> : children}
        </div>

        {onClose && <IconButton size={14} name="close" className="ml-auto" onClick={onClose} />}
      </div>
    </div>
  );
};

Alert.Item = AlertItem;

export default Alert;
