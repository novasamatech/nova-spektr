import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion, FootnoteText } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
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
    <ul className="max-h-[470px] overflow-y-scroll pr-3">
      {shardsStructure.map(([rootAccountId, chainTuple]) => (
        <li key={rootAccountId}>
          <SelectableRoot
            accountId={rootAccountId}
            checked={selectorUtils.isChecked(selectedStructure[rootAccountId])}
            semiChecked={selectorUtils.isSemiChecked(selectedStructure[rootAccountId])}
            onChange={(value) => shardsModel.events.rootToggled({ root: rootAccountId, value })}
          />

          <ul>
            {chainTuple.map(([chainId, accounts]) => (
              <li key={chainId}>
                <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                  <div className="flex hover:bg-action-background-hover">
                    <div className="w-full p-2">
                      <Checkbox
                        checked={selectorUtils.isChecked(selectedStructure[rootAccountId][chainId])}
                        semiChecked={selectorUtils.isSemiChecked(selectedStructure[rootAccountId][chainId])}
                        onChange={(checked) => toggleChain(rootAccountId, chainId, checked)}
                      >
                        <ChainTitle chain={chains[chainId]} fontClass="text-text-primary" />
                        <FootnoteText className="text-text-tertiary">
                          {/* eslint-disable-next-line i18next/no-literal-string */}
                          {selectedStructure[rootAccountId][chainId].checked} /{' '}
                          {selectedStructure[rootAccountId][chainId].total}
                        </FootnoteText>
                      </Checkbox>
                    </div>
                    <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                  </div>
                  <Accordion.Content as="ul">
                    {accounts.map((account) => {
                      if (accountUtils.isAccountWithShards(account)) {
                        return (
                          <ShardedGroup
                            key={account[0].groupId}
                            rootAccountId={rootAccountId}
                            accounts={account}
                            chain={chains[chainId]}
                          />
                        );
                      }

                      return (
                        <li key={account.id} className="ml-6">
                          <SelectableShard
                            account={account}
                            chain={chains[chainId]}
                            checked={selectedStructure[rootAccountId][chainId].accounts[account.accountId]}
                            onChange={(value) => toggleAccount(rootAccountId, chainId, account.accountId, value)}
                          />
                        </li>
                      );
                    })}
                  </Accordion.Content>
                </Accordion>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};
