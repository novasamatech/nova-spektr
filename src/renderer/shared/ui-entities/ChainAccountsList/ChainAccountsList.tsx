import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ScrollArea } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { Account } from '../Account/Account';

type Props = {
  accounts: (readonly [chain: Chain, accountId: AccountId])[];
};

export const ChainAccountsList = memo(({ accounts }: Props) => {
  const { list } = useDeferredList({ list: accounts, forceFirstRender: true });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea>
        <ul className="flex flex-col divide-y divide-divider px-5 pb-3">
          {list.map(([chain, accountId]) => {
            return <ListItem key={chain.chainId} chain={chain} accountId={accountId} />;
          })}
        </ul>
      </ScrollArea>
    </div>
  );
});

const ListItem = memo(({ chain, accountId }: { chain: Chain; accountId: AccountId }) => {
  return (
    <li className="flex min-w-0 items-center gap-2 py-4 text-footnote">
      <div className="flex-1 basis-1/3">
        <ChainTitle fontClass="text-text-primary" chain={chain} />
      </div>
      <div className="flex min-w-0 flex-1 basis-2/3 text-text-secondary">
        <Account variant="truncate" accountId={accountId} chain={chain} explorersTestId={TEST_IDS.COMMON.INFO_BUTTON} />
      </div>
    </li>
  );
});
