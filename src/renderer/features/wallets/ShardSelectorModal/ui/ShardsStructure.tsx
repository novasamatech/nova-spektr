import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { HelpText } from '@/shared/ui';
import { Accordion, Checkbox } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { selectorUtils } from '../lib/selector-utils';
import { shardsModel } from '../model/shards-model';

import { SelectableRoot } from './SelectableRoot';
import { SelectableShard } from './SelectableShard';
import { ShardedGroup } from './ShardedGroup';

export const ShardsStructure = () => {
  const chains = useUnit(networkModel.$chains);
  const shardsStructure = useUnit(shardsModel.$shardsStructure);
  const selectedStructure = useUnit(shardsModel.$selectedStructure);

  const toggleChain = (root: AccountId, chainId: ChainId, value: boolean) => {
    shardsModel.events.chainToggled({ root, chainId, value });
  };

  const toggleAccount = (root: AccountId, chainId: ChainId, accountId: AccountId, value: boolean) => {
    shardsModel.events.accountToggled({ root, chainId, accountId, value });
  };

  return (
    <ul className="max-h-[470px]">
      {shardsStructure.map(([rootAccountId, rootAccountName, chainTuple]) => (
        <li key={rootAccountId}>
          <SelectableRoot
            accountId={rootAccountId}
            accountName={rootAccountName}
            checked={selectorUtils.isChecked(selectedStructure[rootAccountId])}
            semiChecked={selectorUtils.isSemiChecked(selectedStructure[rootAccountId])}
            onChange={(value) => shardsModel.events.rootToggled({ root: rootAccountId, value })}
          />

          <ul className="ml-6">
            {chainTuple.map(([chainId, accounts]) => {
              const isChecked = selectorUtils.isChecked(selectedStructure[rootAccountId][chainId]);
              const isSemiChecked = selectorUtils.isSemiChecked(selectedStructure[rootAccountId][chainId]);

              return (
                <li key={chainId} className="mt-2">
                  <Accordion initialOpen>
                    <Accordion.Trigger>
                      <div className="w-full" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          semiChecked={isSemiChecked}
                          onChange={(checked) => toggleChain(rootAccountId, chainId, checked)}
                        >
                          <div className="flex items-center gap-2">
                            <ChainTitle
                              chain={chains[chainId]}
                              fontClass={cnTw(isChecked || isSemiChecked ? 'text-text-primary' : 'text-text-secondary')}
                            />
                            <HelpText className="text-text-tertiary">
                              {selectedStructure[rootAccountId][chainId].checked} /{' '}
                              {selectedStructure[rootAccountId][chainId].total}
                            </HelpText>
                          </div>
                        </Checkbox>
                      </div>
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <div className="ml-6">
                        {accounts.map((account) => {
                          if (accountUtils.isAccountWithShards(account)) {
                            return (
                              <div key={account[0].groupId} className="mt-2">
                                <ShardedGroup
                                  rootAccountId={rootAccountId}
                                  accounts={account}
                                  chain={chains[chainId]}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={account.id} className="mt-2">
                              <SelectableShard
                                account={account}
                                chain={chains[chainId]}
                                checked={selectedStructure[rootAccountId][chainId].accounts[account.accountId]}
                                onChange={(value) => toggleAccount(rootAccountId, chainId, account.accountId, value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </Accordion.Content>
                  </Accordion>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
};
