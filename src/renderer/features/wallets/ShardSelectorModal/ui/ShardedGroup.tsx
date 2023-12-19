import { ChangeEvent } from 'react';
import { useUnit } from 'effector-react';

import { Accordion, Checkbox, CaptionText, FootnoteText } from '@shared/ui';
import { ShardAccount, Chain, ID } from '@shared/core';
import { shardsModel } from '../model/shards-model';
import { selectorUtils } from '../lib/selector-utils';
import { SelectableShard } from './SelectableShard';

type Props = {
  rootId: ID;
  accounts: ShardAccount[];
  chain: Chain;
};
export const ShardedGroup = ({ rootId, accounts, chain }: Props) => {
  const selectedStructure = useUnit(shardsModel.$selectedStructure);

  const shardedGroup = selectedStructure[rootId][chain.chainId].sharded[accounts[0].groupId];

  const toggleSharded = (event: ChangeEvent<HTMLInputElement>) => {
    shardsModel.events.shardedToggled({
      root: rootId,
      chainId: chain.chainId,
      groupId: accounts[0].groupId,
      value: event.target.checked,
    });
  };

  const toggleShard = (shard: ShardAccount, value: boolean) => {
    shardsModel.events.shardToggled({
      root: rootId,
      chainId: chain.chainId,
      groupId: shard.groupId,
      accountId: shard.accountId,
      value,
    });
  };

  return (
    <Accordion className="ml-6 w-auto rounded">
      <div className="flex rounded hover:bg-action-background-hover">
        <Checkbox
          className="p-2 w-full"
          checked={selectorUtils.isChecked(shardedGroup)}
          semiChecked={selectorUtils.isSemiChecked(shardedGroup)}
          onChange={toggleSharded}
        >
          <div className="flex items-center justify-center w-7.5 h-5 rounded-2lg bg-input-background-disabled">
            <CaptionText className="text-text-secondary">{accounts.length}</CaptionText>
          </div>
          <FootnoteText className="text-text-tertiary">{accounts[0].name}</FootnoteText>
        </Checkbox>

        <Accordion.Button buttonClass="ml-auto w-auto p-2" />
      </div>
      <Accordion.Content as="ul">
        {accounts.map((shard) => (
          <li key={shard.accountId} className="ml-6">
            <SelectableShard
              truncate
              className="w-[240px]"
              account={shard}
              addressPrefix={chain.addressPrefix}
              explorers={chain.explorers}
              checked={shardedGroup[shard.accountId]}
              onChange={(value) => toggleShard(shard, value)}
            />
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
