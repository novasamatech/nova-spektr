import { memo } from 'react';

import { type Account as AccountType, type Chain } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { AccountExplorers } from '../AccountExplorer/AccountExplorers';
import { Address } from '../Address/Address';

type Props = {
  account: AccountType;
  title?: string;
  chain: Chain;
  variant?: 'truncate' | 'short';
};

export const Account = memo(({ account, title, variant = 'truncate', chain }: Props) => {
  return (
    <div className="flex w-max min-w-0 max-w-full items-center gap-2">
      <Address
        showIcon
        variant={variant}
        title={title}
        address={toAddress(account.accountId, { prefix: chain.addressPrefix })}
      />
      <AccountExplorers accountId={account.accountId} chain={chain} />
    </div>
  );
});
