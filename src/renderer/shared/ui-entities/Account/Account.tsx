import { memo } from 'react';

import { type Address as AddresssType, type Chain } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';
import { Address } from '../Address/Address';

type Props = {
  accountId: AccountId | AddresssType;
  title?: string;
  chain: Chain;
  iconSize?: number;
  hideIcon?: boolean;
  hideAddress?: boolean;
  variant?: 'truncate' | 'short';
  addressTestId?: string;
  explorersTestId?: string;
};

export const Account = memo(
  ({
    accountId,
    title,
    variant = 'truncate',
    iconSize,
    hideAddress,
    hideIcon,
    chain,
    addressTestId,
    explorersTestId,
  }: Props) => {
    return (
      <div className="flex w-max max-w-full min-w-0 items-center gap-2">
        <Address
          showIcon={!hideIcon}
          variant={variant}
          iconSize={iconSize}
          hideAddress={hideAddress}
          title={title}
          address={toAddress(accountId, { prefix: chain.addressPrefix })}
          testId={addressTestId}
        />
        <AccountExplorers accountId={accountId} chain={chain} testId={explorersTestId} />
      </div>
    );
  },
);
