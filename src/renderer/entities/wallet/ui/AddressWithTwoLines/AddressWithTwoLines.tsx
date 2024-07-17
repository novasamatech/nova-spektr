import { type ReactNode } from 'react';
import { type IconTheme } from '@polkadot/react-identicon/types';

import { cnTw } from '@shared/lib/utils';
import { Identicon } from '@shared/ui';
import { type AccountId, type Address, type SigningType } from '@shared/core';
import { getAddress } from '../AccountAddress/AccountAddress';

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

type Props = {
  className?: string;
  signType?: SigningType;
  size?: number;
  canCopy?: boolean;
  showIcon?: boolean;
  firstLine: ReactNode;
  secondLine: ReactNode;
  iconTheme?: IconTheme;
} & (WithAccountId | WithAddress);

export const AddressWithTwoLines = ({
  className,
  signType,
  size,
  canCopy,
  showIcon,
  firstLine,
  secondLine,
  iconTheme,
  ...props
}: Props) => {
  return (
    <div className={cnTw('flex items-center gap-x-2 min-w-0', className)}>
      {showIcon && (
        <Identicon theme={iconTheme} address={getAddress(props)} size={size} background={false} canCopy={canCopy} />
      )}
      <div className="truncate">
        {firstLine}
        {secondLine}
      </div>
    </div>
  );
};
