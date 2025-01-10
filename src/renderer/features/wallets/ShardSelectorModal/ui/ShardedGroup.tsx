import { useUnit } from 'effector-react';

import { type Chain, type VaultShardAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion, CaptionText, FootnoteText } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { selectorUtils } from '../lib/selector-utils';
import { shardsModel } from '../model/shards-model';

import { SelectableShard } from './SelectableShard';

type Props = {
  rootAccountId: AccountId;
  accounts: VaultShardAccount[];
  chain: Chain;
};
export const ShardedGroup = ({ rootAccountId, accounts, chain }: Props) => {
  const selectedStructure = useUnit(shardsModel.$selectedStructure);
  const account = accounts.at(0);
  if (!account) return null;

  const shardedGroup = selectedStructure[rootAccountId]?.[chain.chainId]?.sharded[account.groupId];

  const toggleSharded = (checked: boolean) => {
    shardsModel.events.shardedToggled({
      root: rootAccountId,
      chainId: chain.chainId,
      groupId: account.groupId,
      value: checked,
    });
  };

  const toggleShard = (shard: VaultShardAccount, value: boolean) => {
    shardsModel.events.shardToggled({
      root: rootAccountId,
      chainId: chain.chainId,
      groupId: shard.groupId,
      accountId: shard.accountId,
      value,
    });
  };

  return (
    <Accordion className="ml-6 w-auto rounded">
      <div className="flex rounded hover:bg-action-background-hover">
        <div className="w-full p-2">
          <Checkbox
            checked={selectorUtils.isChecked(shardedGroup)}
            semiChecked={selectorUtils.isSemiChecked(shardedGroup)}
            onChange={toggleSharded}
          >
            <div className="flex h-5 w-7.5 items-center justify-center rounded-2lg bg-input-background-disabled">
              <CaptionText className="text-text-secondary">{accounts.length}</CaptionText>
            </div>
            <FootnoteText className="text-text-tertiary">{account.name}</FootnoteText>
          </Checkbox>
        </div>

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
