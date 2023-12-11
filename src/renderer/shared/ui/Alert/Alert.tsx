import { PropsWithChildren, Children } from 'react';

import { cnTw } from '@shared/lib/utils';
import { IconButton, HeadlineText, Icon } from '@shared/ui';
import { Variant } from './common/types';
import { ViewStyle, IconStyle, IconName } from './common/constants';
import AlertItem from './AlertItem';

type Props = {
  title: string;
  active: boolean;
  variant?: Variant;
  className?: string;
  onClose?: () => void;
};

const Alert = ({ title, active, variant = 'info', className, children, onClose }: PropsWithChildren<Props>) => {
  if (!active) return null;

  const isList = Children.toArray(children).length > 0;

  return (
    <div className={cnTw('p-[15px] rounded-lg border w-full', ViewStyle[variant])}>
      <div className="flex items-start gap-x-1.5">
        <div className="flex flex-col gap-y-1 flex-1 max-w-full">
          <div className="flex items-center gap-x-1.5">
            <Icon name={IconName[variant]} size={14} className={IconStyle[variant]} />
            <HeadlineText>{title}</HeadlineText>
          </div>
          {isList ? <ul className={cnTw('flex flex-col gap-y-1 list-none pl-5 ', className)}>{children}</ul> : children}
        </div>

        {onClose && <IconButton size={14} name="close" onClick={onClose} />}
      </div>
    </div>
  );
};

Alert.Item = AlertItem;

export default Alert;
