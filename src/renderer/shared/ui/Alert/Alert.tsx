import { Children, PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { ButtonIcon } from '../Buttons';
import { SmallTitleText } from '../Typography';
import { Variant } from './common/types';
import { IconName, IconStyle, ViewStyle } from './common/constants';
import { AlertItem } from './AlertItem';

type Props = {
  title: string;
  variant?: Variant;
  className?: string;
  onClose?: () => void;
};

export const Alert = ({ title, variant = 'info', className, children, onClose }: PropsWithChildren<Props>) => {
  const isList = Children.toArray(children).length > 0;

  return (
    <div className={cnTw('box-border p-4b rounded-lg border', ViewStyle[variant])}>
      <div className="flex gap-x-2">
        <Icon name={IconName[variant]} size={16} className={cnTw('mt-0.5', IconStyle[variant])} />

        <div className="flex flex-col gap-y-2 flex-1">
          <SmallTitleText>{title}</SmallTitleText>
          {isList ? <ul className={cnTw('flex flex-col gap-y-2 list-none', className)}>{children}</ul> : children}
        </div>

        {onClose && <ButtonIcon className="self-start mt-0.5" size="sm" icon="close" onClick={onClose} />}
      </div>
    </div>
  );
};

Alert.Item = AlertItem;
