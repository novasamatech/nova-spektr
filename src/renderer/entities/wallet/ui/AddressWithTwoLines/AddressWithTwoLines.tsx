import { type IconTheme } from '@polkadot/react-identicon/types';
import { type ReactNode } from 'react';

import { type Address } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Identicon } from '@/shared/ui';
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
  size?: number;
  canCopy?: boolean;
  showIcon?: boolean;
  firstLine: ReactNode;
  secondLine: ReactNode;
  iconTheme?: IconTheme;
} & (WithAccountId | WithAddress);

/**
 * @deprecated Use `import { Address } from '@/shared/ui-entities'` instead.
 */
export const AddressWithTwoLines = ({
  className,
  size,
  canCopy,
  showIcon,
  firstLine,
  secondLine,
  iconTheme,
  ...props
}: Props) => {
  return (
    <div className={cnTw('flex w-full min-w-0 items-center gap-x-2', className)}>
      {showIcon && (
        <Identicon theme={iconTheme} address={getAddress(props)} size={size} background={false} canCopy={canCopy} />
      )}
      <div className="w-full truncate">
        {firstLine}
        {secondLine}
      </div>
    </div>
  );
};
