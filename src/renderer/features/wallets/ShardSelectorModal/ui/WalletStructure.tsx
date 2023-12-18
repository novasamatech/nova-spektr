import { useUnit } from 'effector-react';

import { Accordion, Checkbox, FootnoteText } from '@shared/ui';
import { SelectableShard, accountUtils } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { toAddress } from '@shared/lib/utils';
import { shardsModel } from '../model/shards-model';
import { networkModel } from '@entities/network';

export const WalletStructure = () => {
  // const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const walletStructure = useUnit(shardsModel.$walletStructure);

  // const selectedStructure = useUnit(shardsModel.$selectedStructure);

  // useEffect(() => {
  //
  // }, []);
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
            checked={true}
            // checked={root.isSelected}
            semiChecked={false}
            // semiChecked={root.selectedAmount > 0}
            onChange={(value) => shardsModel.events.rootToggled({ rootAccountId: root.accountId, value })}
          />

          {/* select all chain accounts */}
          <ul>
            {chainTuple.map(([chainId, accounts]) => (
              <li key={chainId}>
                <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                  <div className="hover:bg-action-background-hover flex">
                    <Checkbox
                      // checked={chain.isSelected}
                      checked={true}
                      className="p-2 w-full"
                      // semiChecked={chain.selectedAmount > 0 && chain.selectedAmount < chain.accounts.length}
                      semiChecked={false}
                      onChange={(value) =>
                        shardsModel.events.chainToggled({
                          rootAccountId: root.accountId,
                          chainId,
                          value: value.target.checked,
                        })
                      }
                    >
                      <ChainTitle chain={chains[chainId]} fontClass="text-text-primary" />
                      <FootnoteText className="text-text-tertiary">
                        X / Y{/*{chain.selectedAmount}/{chain.accounts.length}*/}
                      </FootnoteText>
                    </Checkbox>
                    <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                  </div>
                  <Accordion.Content>
                    {/* chains accounts */}
                    <ul>
                      {accounts.map((account) => {
                        const isSharded = accountUtils.isAccountWithShards(account);

                        if (isSharded) return <div key={account[0].id}>SHARDED</div>;
                        const chain = chains[chainId];

                        return (
                          <li key={account.id}>
                            <SelectableShard
                              truncate
                              className="ml-6"
                              name={account.name}
                              address={toAddress(account.accountId, { prefix: chain.addressPrefix })}
                              checked={true}
                              // checked={account.isSelected}
                              explorers={chain.explorers}
                              onChange={(value) =>
                                shardsModel.events.accountToggled({
                                  rootAccountId: root.accountId,
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
