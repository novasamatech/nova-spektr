import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useAccountName } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { Account } from '../Account/Account';

type ListItemProps = {
  chain: Chain;
  accountId: AccountId;
};
export const ListItem = memo<ListItemProps>(({ chain, accountId }) => {
  const resolvedName = useAccountName({ accountId, chain });

  return (
    <div className="grid w-full min-w-0 grid-cols-[calc(50%-16px)_1fr] items-center gap-2 py-4 pr-2 text-footnote">
      <ChainTitle fontClass="text-text-primary" chain={chain} />
      <div className="min-w-0 text-text-secondary">
        <Account variant="truncate" accountId={accountId} chain={chain} title={resolvedName} />
      </div>
    </div>
  );
});
ListItem.displayName = 'ListItem';
