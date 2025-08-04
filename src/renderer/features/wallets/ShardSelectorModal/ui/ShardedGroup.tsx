import { useUnit } from 'effector-react';

import { type Chain, type VaultShardAccount } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Accordion, Checkbox } from '@/shared/ui-kit';
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

  const isChecked = selectorUtils.isChecked(shardedGroup);
  const isSemiChecked = selectorUtils.isSemiChecked(shardedGroup);

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isChecked} semiChecked={isSemiChecked} onChange={toggleSharded}>
            <div className="flex h-5 w-7.5 items-center justify-center rounded-2lg bg-input-background-disabled">
              <CaptionText className="text-text-secondary">{accounts.length}</CaptionText>
            </div>
            <FootnoteText
              className={cnTw('normal-case', isChecked || isSemiChecked ? 'text-text-primary' : 'text-text-secondary')}
            >
              {account.name}
            </FootnoteText>
          </Checkbox>
        </div>
      </Accordion.Trigger>
      <Accordion.Content>
        {accounts.map((shard) => (
          <li key={shard.accountId} className="mt-2 ml-6">
            <SelectableShard
              account={shard}
              chain={chain}
              checked={shardedGroup[shard.accountId]}
              onChange={(value) => toggleShard(shard, value)}
            />
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
