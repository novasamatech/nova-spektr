import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { Collapsible } from './Collapsible';
import { ListItem } from './ListItem';
import { type ChainAccountPair } from './types';

type GroupItemProps = {
  groupChain: Chain;
  groupAccountId: AccountId;
  parachains: ChainAccountPair[];
  bgColor?: string;
};
export const GroupItem = memo<GroupItemProps>(({ groupChain, groupAccountId, parachains, bgColor }) => {
  if (parachains.length > 0) {
    return (
      <Collapsible>
        <Collapsible.Trigger sticky bgColor={bgColor}>
          <ListItem chain={groupChain} accountId={groupAccountId} />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="divide-y divide-divider pl-6">
            {parachains.map(([parachain, accountId]) => (
              <ListItem key={parachain.chainId} chain={parachain} accountId={accountId} />
            ))}
          </div>
        </Collapsible.Content>
      </Collapsible>
    );
  }
  return (
    <div key={groupChain.chainId} className="pl-6">
      <ListItem chain={groupChain} accountId={groupAccountId} />
    </div>
  );
});
GroupItem.displayName = 'GroupItem';
