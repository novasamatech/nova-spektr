import { useUnit } from 'effector-react';

import { Accordion, Checkbox, FootnoteText } from '@shared/ui';
import { SelectableShard, accountUtils } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { toAddress } from '@shared/lib/utils';
import { shardsModel } from '../model/shards-model';
import { networkModel } from '@entities/network';
import { shardsUtils } from '../lib/shards-utils';
import { useI18n } from '@app/providers';
import { ShardedGroup } from './ShardedGroup';

export const WalletStructure = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const walletStructure = useUnit(shardsModel.$walletStructure);
  const selectedStructure = useUnit(shardsModel.$selectedStructure);

  console.log(121212);

  return (
    <ul className="overflow-y-scroll max-h-[470px] pr-3">
      {/*{!query && (*/}
      {/*  <li key="all" className="p-2">*/}
      {/*    <Checkbox*/}
      {/*      checked={allShardsChecked}*/}
      {/*      semiChecked={allShardsSemiChecked}*/}
      {/*      onChange={(event) => selectAll(event.target.checked)}*/}
      {/*    >*/}
      {/*      {t('balances.allShards')}*/}
      {/*    </Checkbox>*/}
      {/*  </li>*/}
      {/*)}*/}
      {walletStructure.map(([root, chainTuple]) => (
        <li key={root.id}>
          <SelectableShard
            name={root.name}
            address={toAddress(root.accountId, { prefix: 1 })}
            checked={shardsUtils.isChecked(selectedStructure[root.id])}
            semiChecked={shardsUtils.isSemiChecked(selectedStructure[root.id])}
            onChange={(value) => shardsModel.events.rootToggled({ root: root.id, value })}
          />

          <ul>
            {chainTuple.map(([chainId, accounts]) => (
              <li key={chainId}>
                <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                  <div className="hover:bg-action-background-hover flex">
                    <Checkbox
                      checked={shardsUtils.isChecked(selectedStructure[root.id][chainId])}
                      semiChecked={shardsUtils.isSemiChecked(selectedStructure[root.id][chainId])}
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
                  <Accordion.Content>
                    <ul>
                      {accounts.map((account) => {
                        const isSharded = accountUtils.isAccountWithShards(account);

                        const chain = chains[chainId];
                        if (isSharded) return <ShardedGroup rootId={root.id} accounts={account} chain={chain} />;

                        return (
                          <li key={account.id}>
                            <SelectableShard
                              truncate
                              className="ml-6"
                              name={account.name}
                              address={toAddress(account.accountId, { prefix: chain.addressPrefix })}
                              checked={selectedStructure[root.id][chainId].accounts[account.accountId]}
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
                    </ul>
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
