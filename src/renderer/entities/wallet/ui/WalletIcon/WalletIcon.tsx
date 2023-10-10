import { WalletType } from '@renderer/shared/core';
import { Icon } from '@renderer/shared/ui';
import { WalletIconBg, WalletIconNames } from '@renderer/entities/wallet/model/constansts';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  type: WalletType;
  className?: string;
  size?: number;
};

export const WalletIcon = ({ type, size = 20, className }: Props) => {
  return (
    <Icon
      name={WalletIconNames[type]}
      size={size}
      className={cnTw('rounded-full text-white', WalletIconBg[type], className)}
    />
  );
};
