import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ChainTitle } from '@/entities/chain';
import { Account } from '../Account/Account';

type ListItemProps = {
  chain: Chain;
  accountId: AccountId;
};
export const ListItem = memo<ListItemProps>(({ chain, accountId }) => (
  <div className="grid w-full min-w-0 grid-cols-[calc(50%-16px)_1fr] items-center gap-2 py-4 pr-2 text-footnote">
    <ChainTitle fontClass="text-text-primary" chain={chain} />
    <div className="min-w-0 text-text-secondary">
      <Account variant="truncate" accountId={accountId} chain={chain} />
    </div>
  </div>
));
ListItem.displayName = 'ListItem';
