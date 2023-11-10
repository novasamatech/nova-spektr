import { ReactNode } from 'react';
import { IconTheme } from '@polkadot/react-identicon/types';

import { cnTw } from '@renderer/shared/lib/utils';
import { Identicon } from '@renderer/shared/ui';
import { SigningType } from '@renderer/shared/core';
import { getAddress } from '../AccountAddress/AccountAddress';
import type { AccountId, Address } from '@renderer/shared/core';

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
    <div className={cnTw('flex items-center gap-x-2', className)}>
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
