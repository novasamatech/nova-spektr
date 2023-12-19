import { useUnit } from 'effector-react';

import { Accordion, Checkbox, CaptionText, FootnoteText } from '@shared/ui';
import { shardsModel } from '../model/shards-model';
import { ShardAccount, Chain, ID } from '@shared/core';
import { shardsUtils } from '../lib/shards-utils';
import { SelectableShard } from '@entities/wallet';
import { toAddress } from '@shared/lib/utils';

type Props = {
  rootId: ID;
  accounts: ShardAccount[];
  chain: Chain;
};
export const ShardedGroup = ({ rootId, accounts, chain }: Props) => {
  const selectedStructure = useUnit(shardsModel.$selectedStructure);

  const shardedGroup = selectedStructure[rootId][chain.chainId].sharded[accounts[0].groupId];

  return (
    <div>
      <Accordion isDefaultOpen className="ml-6 w-auto rounded">
        <div className="hover:bg-action-background-hover flex">
          <Checkbox
            className="p-2 w-full"
            checked={shardsUtils.isChecked(shardedGroup)}
            semiChecked={shardsUtils.isSemiChecked(shardedGroup)}
            onChange={(event) =>
              shardsModel.events.shardedToggled({
                root: rootId,
                chainId: chain.chainId,
                groupId: accounts[0].groupId,
                value: event.target.checked,
              })
            }
          >
            <CaptionText className="text-text-secondary py-1 px-2 bg-input-background">{accounts.length}</CaptionText>
            <FootnoteText className="text-text-tertiary">{accounts[0].name}</FootnoteText>
          </Checkbox>
          <Accordion.Button buttonClass="ml-auto w-auto p-2" />
        </div>
        <Accordion.Content>
          {accounts.map((shard) => (
            <SelectableShard
              truncate
              key={shard.accountId}
              className="ml-6"
              name=""
              address={toAddress(shard.accountId, { prefix: chain.addressPrefix })}
              explorers={chain.explorers}
              checked={shardedGroup[shard.accountId]}
              onChange={(checked) =>
                shardsModel.events.shardToggled({
                  root: rootId,
                  chainId: chain.chainId,
                  groupId: shard.groupId,
                  accountId: shard.accountId,
                  value: checked,
                })
              }
            />
          ))}
        </Accordion.Content>
      </Accordion>
    </div>
  );
};
