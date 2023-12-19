import { useUnit } from 'effector-react';

import { Accordion, Checkbox, FootnoteText } from '@shared/ui';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { RootExplorers } from '@shared/lib/utils';
import { shardsModel } from '../model/shards-model';
import { networkModel } from '@entities/network';
import { useI18n } from '@app/providers';
import { ShardedGroup } from './ShardedGroup';
import { SelectableShard } from './SelectableShard';
import { selectorUtils } from '../lib/selector-utils';

export const ShardsStructure = () => {
  const { t } = useI18n();

  const wallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);
  const shardsStructure = useUnit(shardsModel.$shardsStructure);
  const selectedStructure = useUnit(shardsModel.$selectedStructure);
  const isAllChecked = useUnit(shardsModel.$isAllChecked);
  const isAllSemiChecked = useUnit(shardsModel.$isAllSemiChecked);

  return (
    <ul className="overflow-y-scroll max-h-[470px] pr-3">
      {walletUtils.isMultiShard(wallet) && (
        <li key="all" className="p-2">
          <Checkbox
            checked={isAllChecked}
            semiChecked={isAllSemiChecked}
            onChange={(event) => shardsModel.events.allToggled(event.target.checked)}
          >
            {t('balances.allShards')}
          </Checkbox>
        </li>
      )}

      {shardsStructure.map(([root, chainTuple]) => (
        <li key={root.id}>
          <SelectableShard
            account={root}
            addressPrefix={1}
            explorers={RootExplorers}
            checked={selectorUtils.isChecked(selectedStructure[root.id])}
            semiChecked={selectorUtils.isSemiChecked(selectedStructure[root.id])}
            onChange={(value) => shardsModel.events.rootToggled({ root: root.id, value })}
          />

          <ul>
            {chainTuple.map(([chainId, accounts]) => (
              <li key={chainId}>
                <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                  <div className="hover:bg-action-background-hover flex">
                    <Checkbox
                      checked={selectorUtils.isChecked(selectedStructure[root.id][chainId])}
                      semiChecked={selectorUtils.isSemiChecked(selectedStructure[root.id][chainId])}
                      className="p-2 w-full"
                      onChange={(value) =>
                        shardsModel.events.chainToggled({
                          root: root.id,
                          chainId,
                          value: value.target.checked,
                        })
                      }
                    >
                      <ChainTitle chain={chains[chainId]} fontClass="text-text-primary" />
                      <FootnoteText className="text-text-tertiary">
                        {selectedStructure[root.id][chainId].checked} / {selectedStructure[root.id][chainId].total}
                      </FootnoteText>
                    </Checkbox>
                    <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                  </div>
                  <Accordion.Content as="ul">
                    {accounts.map((account) => {
                      const isSharded = accountUtils.isAccountWithShards(account);

                      const chain = chains[chainId];
                      if (isSharded) {
                        return (
                          <ShardedGroup key={account[0].groupId} rootId={root.id} accounts={account} chain={chain} />
                        );
                      }

                      return (
                        <li key={account.id} className="ml-6">
                          <SelectableShard
                            truncate
                            className="w-[270px]"
                            account={account}
                            checked={selectedStructure[root.id][chainId].accounts[account.accountId]}
                            addressPrefix={chain.addressPrefix}
                            explorers={chain.explorers}
                            onChange={(value) =>
                              shardsModel.events.accountToggled({
                                root: root.id,
                                chainId: chain.chainId,
                                accountId: account.accountId,
                                value,
                              })
                            }
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
