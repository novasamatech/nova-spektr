import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';
import { useUnit } from 'effector-react';

import type { Account } from '@shared/core';
import { Accordion, BaseModal, Button, Checkbox, FootnoteText, SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainMap, chainsService } from '@entities/network';
import { SelectableShard } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { toAddress } from '@shared/lib/utils';
import { selectShardsUtils } from '../lib/utils';
import { selectShardsModel } from '@features/wallets/SelectShards/model/select-shards-model';

type Props = {
  accounts: Account[];
  activeShards: Account[];
  isOpen: boolean;
  onClose: (selectedAccounts?: Account[]) => void;
};

export const SelectShardModal = ({ isOpen, activeShards, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [chains, setChains] = useState<ChainMap>({});
  const query = useUnit(selectShardsModel.$query);
  const searchedShards = useUnit(selectShardsModel.$searchedShards);
  const allShardsChecked = useUnit(selectShardsModel.$allShardsChecked);
  const allShardsSemiChecked = useUnit(selectShardsModel.$allShardsSemiChecked);

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsById = keyBy(chains, 'chainId');
    setChains(chainsById);

    const activeIds = activeShards.map((shard) => shard.id);

    const multishard = selectShardsUtils.getMultishardStructure(accounts, chainsById);
    const selectable = selectShardsUtils.getSelectableShards(multishard, activeIds);
    selectShardsModel.events.shardSelectorOpened(selectable);
  }, [accounts.length, activeShards.length]);

  const selectAll = (value: boolean) => {
    // shards.rootAccounts.forEach((r) => selectRoot(value, r.accountId));
  };

  const handleSubmit = () => {
    // const selected: Account[] = [];
    // shards.rootAccounts.forEach((root) => {
    //   if (root.isSelected) {
    //     selected.push(root);
    //   }
    //   root.chains.forEach((chain) => chain.accounts.forEach((a) => a.isSelected && selected.push(a)));
    // });
    //
    // onClose(selected);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('balances.shardsModalTitle')}
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

      {/* root accounts */}
      <ul className="overflow-y-scroll max-h-[470px] pr-3">
        {!query && (
          <li key="all" className="p-2">
            <Checkbox
              checked={allShardsChecked}
              semiChecked={allShardsSemiChecked}
              onChange={(event) => selectAll(event.target.checked)}
            >
              {t('balances.allShards')}
            </Checkbox>
          </li>
        )}
        {searchedShards?.rootAccounts.map((root) => (
          <li key={root.id}>
            <SelectableShard
              name={root.name}
              address={toAddress(root.accountId, { prefix: 1 })}
              checked={root.isSelected}
              semiChecked={root.selectedAmount > 0}
              onChange={(checked) =>
                selectShardsModel.events.rootSelected({ value: checked, accountId: root.accountId })
              }
            />

            {/* select all chain accounts */}
            <ul>
              {root.chains.map((chain) => (
                <li key={chain.chainId}>
                  <Accordion isDefaultOpen className="ml-6 w-auto rounded">
                    <div className="hover:bg-action-background-hover flex">
                      <Checkbox
                        checked={chain.isSelected}
                        className="p-2 w-full"
                        semiChecked={chain.selectedAmount > 0 && chain.selectedAmount < chain.accounts.length}
                        onChange={(event) =>
                          selectShardsModel.events.chainSelected({
                            value: event.target?.checked,
                            chainId: chain.chainId,
                            accountId: root.accountId,
                          })
                        }
                      >
                        <ChainTitle chain={chain} fontClass="text-text-primary" />
                        <FootnoteText className="text-text-tertiary">
                          {chain.selectedAmount}/{chain.accounts.length}
                        </FootnoteText>
                      </Checkbox>
                      <Accordion.Button buttonClass="ml-auto w-auto p-2" />
                    </div>
                    <Accordion.Content>
                      {/* chains accounts */}
                      <ul>
                        {chain.accounts.map((account) => (
                          <li key={account.id}>
                            <SelectableShard
                              className="ml-6"
                              truncate
                              name={account.name}
                              address={toAddress(account.accountId, {
                                prefix: chains[account.chainId]?.addressPrefix,
                              })}
                              checked={account.isSelected}
                              explorers={chains[account.chainId]?.explorers}
                              onChange={(checked) =>
                                selectShardsModel.events.accountSelected({ value: checked, account })
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </Accordion.Content>
                  </Accordion>
                </li>
              ))}
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
