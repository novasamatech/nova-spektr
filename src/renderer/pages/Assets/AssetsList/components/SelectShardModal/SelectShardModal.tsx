import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';

import type { AccountId, ChainId, Account } from '@shared/core';
import { Accordion, BaseModal, Button, Checkbox, FootnoteText, SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';
import { chainsService } from '@entities/network';
import { SelectableShard } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { toAddress } from '@shared/lib/utils';
import { SelectableShards, ChainsRecord, SelectableAccount } from '../../common/types';
import { getMultishardStructure, searchShards, getSelectableShards } from '../../common/utils';

type Props = {
  accounts: Account[];
  activeShards: Account[];
  isOpen: boolean;
  onClose: (selectedAccounts?: Account[]) => void;
};

export const SelectShardModal = ({ isOpen, activeShards, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [chains, setChains] = useState<ChainsRecord>({});
  const [shards, setShards] = useState<SelectableShards>({ rootAccounts: [], amount: 0 });
  const [query, setQuery] = useState('');

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsById = keyBy(chains, 'chainId');
    const activeIds = activeShards.map((shard) => shard.id);

    const multishard = getMultishardStructure(accounts, chainsById);
    const selectable = getSelectableShards(multishard, activeIds);

    setChains(chainsById);
    setShards(selectable);
    setQuery('');
  }, [accounts.length, activeShards.length]);

  const selectRoot = (value: boolean, accountId: AccountId) => {
    const root = shards.rootAccounts.find((r) => r.accountId === accountId);
    if (!root) return;

    root.isSelected = value;
    root.selectedAmount = value ? root.chains.length : 0;
    root.chains.forEach((c) => {
      c.isSelected = value;
      c.selectedAmount = value ? c.accounts.length : 0;
      c.accounts.forEach((a) => (a.isSelected = value));
    });

    setShards({ ...shards });
  };

  const selectChain = (value: boolean, chainId: ChainId, accountId: AccountId) => {
    const root = shards.rootAccounts.find((r) => r.accountId === accountId);
    const chain = root?.chains.find((c) => c.chainId === chainId);
    if (!root || !chain) return;

    chain.isSelected = value;
    chain.accounts.forEach((a) => (a.isSelected = value));
    chain.selectedAmount = value ? chain.accounts.length : 0;

    root.selectedAmount = root.chains.reduce((acc, chain) => acc + chain.selectedAmount, 0);

    setShards({ ...shards });
  };

  const selectAccount = (value: boolean, account: SelectableAccount) => {
    const root = shards.rootAccounts.find((root) => root.id === account.baseId);
    const chain = root?.chains.find((chain) => chain.chainId === account.chainId);

    if (!root || !chain) return;
    account.isSelected = value;

    const selectedAccounts = chain.accounts.filter((a) => a.isSelected);
    chain.isSelected = selectedAccounts.length === chain.accounts.length;
    chain.selectedAmount = selectedAccounts.length;

    root.selectedAmount = root.chains.reduce((acc, c) => acc + c.selectedAmount, 0);

    setShards({ ...shards });
  };

  const selectAll = (value: boolean) => {
    shards.rootAccounts.forEach((r) => selectRoot(value, r.accountId));
  };

  const handleSubmit = () => {
    const selected: Account[] = [];
    shards.rootAccounts.forEach((root) => {
      if (root.isSelected) {
        selected.push(root);
      }
      root.chains.forEach((chain) => chain.accounts.forEach((a) => a.isSelected && selected.push(a)));
    });

    onClose(selected);
  };

  const searchedShards = searchShards(shards, query);
  const allShardsChecked = searchedShards.rootAccounts.every(
    (r) => r.isSelected && r.chains.every((c) => c.isSelected),
  );
  const allShardsSemiChecked =
    !allShardsChecked && searchedShards.rootAccounts.some((r) => r.isSelected || r.selectedAmount > 0);

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
        onChange={setQuery}
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
        {searchedShards.rootAccounts.map((root) => (
          <li key={root.id}>
            <SelectableShard
              name={root.name}
              address={toAddress(root.accountId, { prefix: 1 })}
              checked={root.isSelected}
              semiChecked={root.selectedAmount > 0}
              onChange={(checked) => selectRoot(checked, root.accountId)}
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
                        onChange={(event) => selectChain(event.target?.checked, chain.chainId, root.accountId)}
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
                              onChange={(checked) => selectAccount(checked, account)}
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
