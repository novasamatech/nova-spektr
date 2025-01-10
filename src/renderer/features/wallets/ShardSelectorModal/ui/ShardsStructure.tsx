import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { RootExplorers } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion, FootnoteText } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { selectorUtils } from '../lib/selector-utils';
import { shardsModel } from '../model/shards-model';

import { SelectableShard } from './SelectableShard';
import { ShardedGroup } from './ShardedGroup';

export const ShardsStructure = () => {
  const { t } = useI18n();

  const wallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);
  const shardsStructure = useUnit(shardsModel.$shardsStructure);
  const selectedStructure = useUnit(shardsModel.$selectedStructure);
  const isAllChecked = useUnit(shardsModel.$isAllChecked);
  const isAllSemiChecked = useUnit(shardsModel.$isAllSemiChecked);

  const toggleChain = (root: AccountId, chainId: ChainId, value: boolean) => {
    shardsModel.events.chainToggled({ root, chainId, value });
  };

  const toggleAccount = (root: AccountId, chainId: ChainId, accountId: AccountId, value: boolean) => {
    shardsModel.events.accountToggled({ root, chainId, accountId, value });
  };

  return (
    <ul className="max-h-[470px] overflow-y-scroll pr-3">
      {walletUtils.isMultiShard(wallet) && (
        <li key="all" className="p-2">
          <Checkbox
            checked={isAllChecked}
            semiChecked={isAllSemiChecked}
            onChange={(checked) => shardsModel.events.allToggled(checked)}
          >
            {t('balances.allAccounts')}
          </Checkbox>
        </li>
      )}

      {shardsStructure.map(([root, chainTuple]) => (
        <li key={root.id}>
          <SelectableShard
            wallet={wallet}
            account={root}
            addressPrefix={1}
            explorers={RootExplorers}
            checked={selectorUtils.isChecked(selectedStructure[root.accountId])}
            semiChecked={selectorUtils.isSemiChecked(selectedStructure[root.accountId])}
            onChange={(value) => shardsModel.events.rootToggled({ root: root.accountId, value })}
          />

          <ul>
            {chainTuple.map(([chainId, accounts]) => (
              <li key={chainId}>
                <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                  <div className="flex hover:bg-action-background-hover">
                    <div className="w-full p-2">
                      <Checkbox
                        checked={selectorUtils.isChecked(selectedStructure[root.accountId][chainId])}
                        semiChecked={selectorUtils.isSemiChecked(selectedStructure[root.accountId][chainId])}
                        onChange={(checked) => toggleChain(root.accountId, chainId, checked)}
                      >
                        <ChainTitle chain={chains[chainId]} fontClass="text-text-primary" />
                        <FootnoteText className="text-text-tertiary">
                          {/* eslint-disable-next-line i18next/no-literal-string */}
                          {selectedStructure[root.accountId][chainId].checked} /{' '}
                          {selectedStructure[root.accountId][chainId].total}
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
                            rootAccountId={root.accountId}
                            accounts={account}
                            chain={chains[chainId]}
                          />
                        );
                      }

                      return (
                        <li key={account.id} className="ml-6">
                          <SelectableShard
                            truncate
                            className="w-[270px]"
                            account={account}
                            checked={selectedStructure[root.accountId][chainId].accounts[account.accountId]}
                            addressPrefix={chains[chainId].addressPrefix}
                            explorers={chains[chainId].explorers}
                            onChange={(value) => toggleAccount(root.accountId, chainId, account.accountId, value)}
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
