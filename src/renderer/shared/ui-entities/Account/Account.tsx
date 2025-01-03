import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';
import { Address } from '../Address/Address';

type Props = {
  accountId: AccountId;
  title?: string;
  chain: Chain;
  variant?: 'truncate' | 'short';
};

export const Account = memo(({ accountId, title, variant = 'truncate', chain }: Props) => {
  return (
    <div className="flex w-max min-w-0 max-w-full items-center gap-2">
      <Address
        showIcon
        variant={variant}
        title={title}
        address={toAddress(accountId, { prefix: chain.addressPrefix })}
      />
      <AccountExplorers accountId={accountId} chain={chain} />
    </div>
  );
});
