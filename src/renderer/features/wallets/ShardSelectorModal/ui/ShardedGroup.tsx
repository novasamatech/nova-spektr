import { useUnit } from 'effector-react';

import { Accordion, Checkbox, CaptionText, FootnoteText } from '@shared/ui';
import { ShardAccount, Chain, ID } from '@shared/core';
import { toAddress } from '@shared/lib/utils';
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

  return (
    <Accordion isDefaultOpen className="ml-6 w-auto rounded">
      <div className="hover:bg-action-background-hover flex">
        <Checkbox
          className="p-2 w-full"
          checked={selectorUtils.isChecked(shardedGroup)}
          semiChecked={selectorUtils.isSemiChecked(shardedGroup)}
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
      <Accordion.Content as="ul">
        {accounts.map((shard) => (
          <li key={shard.accountId} className="ml-6">
            <SelectableShard
              truncate
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
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
