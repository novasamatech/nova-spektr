import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';
import { useUnit } from 'effector-react';

import type { Account } from '@shared/core';
import { Accordion, BaseModal, Button, CaptionText, Checkbox, FootnoteText, SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainMap, chainsService } from '@entities/network';
import { SelectableShard, SHARDED_KEY_NAMES, walletModel, walletUtils } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { toAddress } from '@shared/lib/utils';
import { selectShardsUtils } from '../lib/utils';
import { selectShardsModel } from '@features/wallets/SelectShards/model/select-shards-model';
import { ShardsTree } from '@features/wallets/SelectShards/lib/types';

type Props = {
  accounts: Account[];
  activeShards: Account[];
  isOpen: boolean;
  onClose: (selectedAccounts?: Account[]) => void;
};

export const SelectShardModal = ({ isOpen, activeShards, accounts, onClose }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);

  const [chains, setChains] = useState<ChainMap>({});
  const [shards, setShards] = useState<ShardsTree>();
  const query = useUnit(selectShardsModel.$query);
  const selectedAccounts = useUnit(selectShardsModel.$selectedAccounts);
  const rootData = useUnit(selectShardsModel.$rootData);
  const chainData = useUnit(selectShardsModel.$chainData);
  const allShardsChecked = useUnit(selectShardsModel.$allShardsChecked);
  const allShardsSemiChecked = useUnit(selectShardsModel.$allShardsSemiChecked);

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsById = keyBy(chains, 'chainId');
    setChains(chainsById);

    setShards(selectShardsUtils.getShardsTreeStructure(accounts, chainsById));
    selectShardsModel.events.selectorOpened({ accounts, activeAccounts: activeShards });
  }, [accounts.length, activeShards.length]);

  const handleSubmit = () => {
    // Object.entries(selectedAccounts)
  };

  if (!(shards && rootData && chainData && selectedAccounts)) return;

  return (
    <BaseModal
      isOpen={isOpen}
      title={t(isPolkadotVault ? 'balances.shardsModalTitlePv' : 'balances.shardsModalTitle')}
      closeButton
      contentClass="pl-3 pr-0 py-4"
      headerClass="px-5 py-4"
      onClose={onClose}
    >
      <SearchInput
        value={query}
        placeholder={t('balances.searchPlaceholder')}
        wrapperClass="mb-4 ml-2 mr-5"
        onChange={selectShardsModel.events.searchChanged}
      />

      <ul className="overflow-y-scroll max-h-[470px] pr-3">
        {!isPolkadotVault && (
          <li key="all" className="p-2">
            <Checkbox
              checked={allShardsChecked}
              semiChecked={allShardsSemiChecked}
              onChange={(event) => {
                shards?.map(([root, chainsWithAccounts]) =>
                  selectShardsModel.events.rootToggled({
                    value: event.target.checked,
                    rootId: root.accountId,
                    chainsWithAccounts,
                  }),
                );
              }}
            >
              {t('balances.allShards')}
            </Checkbox>
          </li>
        )}

        {/* root accounts */}
        {shards?.map(([root, chainsWithAccounts]) => (
          <li key={root.id}>
            <SelectableShard
              name={isPolkadotVault ? activeWallet?.name : root.name}
              identicon={isPolkadotVault ? 'jdenticon' : undefined}
              address={toAddress(root.accountId, { prefix: 1 })}
              checked={rootData![root.accountId].checked === rootData![root.accountId].total}
              semiChecked={rootData![root.accountId].checked > 0}
              onChange={(checked) =>
                selectShardsModel.events.rootToggled({ value: checked, rootId: root.accountId, chainsWithAccounts })
              }
            />

            {/* select all chain accounts */}
            <ul>
              {chainsWithAccounts.map(([chain, chainAccounts]) => {
                const currentChain = chainData![`${root.accountId}_${chain.chainId}`];

                return (
                  <li key={chain.chainId}>
                    <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                      <div className="hover:bg-action-background-hover flex">
                        <Checkbox
                          checked={currentChain.checked === currentChain.total}
                          className="p-2 w-full"
                          semiChecked={currentChain.checked > 0}
                          onChange={(event) =>
                            selectShardsModel.events.chainToggled({
                              value: event.target?.checked,
                              chainId: chain.chainId,
                              rootId: root.accountId,
                              chainAccounts,
                            })
                          }
                        >
                          <ChainTitle chain={chain} fontClass="text-text-primary" />
                          <FootnoteText className="text-text-tertiary">
                            {currentChain.checked}/{currentChain.total}
                          </FootnoteText>
                        </Checkbox>
                        <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                      </div>
                      <Accordion.Content>
                        {/* chains accounts */}
                        <ul>
                          {chainAccounts.map((account) => {
                            if (Array.isArray(account)) {
                              return (
                                <Accordion isDefaultOpen className="ml-6 w-auto rounded" key={account[0].groupId}>
                                  <div className="hover:bg-action-background-hover flex">
                                    <Checkbox
                                      checked={currentChain.checked === currentChain.total}
                                      className="p-2 w-full"
                                      semiChecked={currentChain.checked > 0}
                                      onChange={(event) =>
                                        account.map((a) =>
                                          selectShardsModel.events.accountToggled({
                                            value: event.target.checked,
                                            account: a,
                                            chainId: chain.chainId,
                                            rootId: root.accountId,
                                            shardGroupId: a.groupId,
                                          }),
                                        )
                                      }
                                    >
                                      <CaptionText className="text-text-secondary py-1 px-2 bg-input-background">
                                        {account.length}
                                      </CaptionText>
                                      <FootnoteText className="text-text-tertiary">
                                        {SHARDED_KEY_NAMES[account[0].keyType]}
                                      </FootnoteText>
                                    </Checkbox>
                                    <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                                  </div>
                                  <Accordion.Content>
                                    {account.map((shard) => (
                                      <SelectableShard
                                        key={shard.accountId}
                                        className="ml-6"
                                        truncate
                                        address={toAddress(shard.accountId, {
                                          prefix: chains[shard.chainId]?.addressPrefix,
                                        })}
                                        checked={selectedAccounts![`${shard.accountId}_${shard.name}`]}
                                        explorers={chains[shard.chainId]?.explorers}
                                        onChange={(checked) =>
                                          selectShardsModel.events.accountToggled({
                                            value: checked,
                                            account: shard,
                                            chainId: chain.chainId,
                                            rootId: root.accountId,
                                            shardGroupId: shard.groupId,
                                          })
                                        }
                                      />
                                    ))}
                                  </Accordion.Content>
                                </Accordion>
                              );
                            } else {
                              return (
                                <li key={account.id}>
                                  <SelectableShard
                                    className="ml-6"
                                    truncate
                                    name={account.name}
                                    address={toAddress(account.accountId, {
                                      prefix: chains[account.chainId]?.addressPrefix,
                                    })}
                                    keyType={isPolkadotVault ? account.keyType : undefined}
                                    checked={selectedAccounts![`${account.accountId}_${account.name}`]}
                                    explorers={chains[account.chainId]?.explorers}
                                    onChange={(checked) =>
                                      selectShardsModel.events.accountToggled({
                                        value: checked,
                                        account,
                                        chainId: chain.chainId,
                                        rootId: root.accountId,
                                      })
                                    }
                                  />
                                </li>
                              );
                            }
                          })}
                        </ul>
                      </Accordion.Content>
                    </Accordion>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      <Button className="ml-auto mt-7 mr-5" onClick={handleSubmit}>
        {t('balances.shardsModalButton')}
      </Button>
    </BaseModal>
  );
};
