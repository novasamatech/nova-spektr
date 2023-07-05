import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';

import { AccountId, ChainId } from '@renderer/domain/shared-kernel';
import { BaseModal, Button, Checkbox, FootnoteText, SearchInput, Chain } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import { useChains } from '@renderer/services/network/chainsService';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import {
  getMultishardStructure,
  getSelectableShards,
  searchShards,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';
import {
  ChainsRecord,
  SelectableAccount,
  SelectableShards,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';

type Props = {
  accounts: AccountDS[];
  activeAccounts: AccountDS[];
  isOpen: boolean;
  onClose: (selectedAccounts?: AccountDS[]) => void;
};

export const SelectShardModal = ({ isOpen, onClose, activeAccounts, accounts }: Props) => {
  const { t } = useI18n();
  const { getChainsData, sortChains } = useChains();

  const [chains, setChains] = useState<ChainsRecord>({});

  useEffect(() => {
    if (!accounts[0]?.walletId) return;

    getChainsData().then((chains) => {
      const chainsById = keyBy(sortChains(chains), 'chainId');
      const activeIds = activeAccounts.map((a) => a.id || '');

      const multishard = getMultishardStructure(accounts, chainsById, accounts[0].walletId!);
      const selectable = getSelectableShards(multishard, activeIds);

      setChains(chainsById);
      setShards(selectable);
      setQuery('');
    });
  }, [activeAccounts]);

  const [shards, setShards] = useState<SelectableShards>({ rootAccounts: [], amount: 0 });
  const [query, setQuery] = useState('');

  const selectRoot = (value: boolean, rootId: AccountId) => {
    const root = shards.rootAccounts.find((r) => r.accountId === rootId);
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

  const selectChain = (value: boolean, chainId: ChainId, rootId: AccountId) => {
    const root = shards.rootAccounts.find((r) => r.accountId === rootId);
    const chain = root?.chains.find((c) => c.chainId === chainId);
    if (!root || !chain) return;

    chain.isSelected = value;
    chain.accounts.forEach((a) => (a.isSelected = value));
    chain.selectedAmount = value ? chain.accounts.length : 0;

    root.selectedAmount = root.chains.reduce((acc, c) => acc + c.selectedAmount, 0);

    setShards({ ...shards });
  };

  const selectAccount = (value: boolean, account: SelectableAccount) => {
    const root = shards.rootAccounts.find((r) => r.id === account.rootId);
    const chain = root?.chains.find((c) => c.chainId === account.chainId);

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
    const selected: AccountDS[] = [];
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
      contentClass="px-5 py-4"
      headerClass="px-5 py-4"
      onClose={onClose}
    >
      <SearchInput
        value={query}
        placeholder={t('balances.searchPlaceholder')}
        wrapperClass="mb-4"
        onChange={setQuery}
      />

      {/* root accounts */}
      <ul className="overflow-y-scroll max-h-[470px]">
        {!query && (
          <li key="all" className="mb-2">
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
            <Checkbox
              checked={root.isSelected}
              className="py-0.5"
              semiChecked={root.selectedAmount > 0}
              onChange={(event) => selectRoot(event.target?.checked, root.accountId)}
            >
              <AddressWithExplorers
                explorers={root.chainId && chains[root.chainId]?.explorers}
                accountId={root.accountId}
                addressPrefix={root.chainId && chains[root.chainId]?.addressPrefix}
                name={root.name}
              />
            </Checkbox>

            {/* chains accounts */}
            <ul>
              {root.chains.map((chain) => (
                <li key={chain.chainId}>
                  <Checkbox
                    checked={chain.isSelected}
                    className="py-1.5 ml-6"
                    semiChecked={chain.selectedAmount > 0 && chain.selectedAmount < chain.accounts.length}
                    onChange={(event) => selectChain(event.target?.checked, chain.chainId, root.accountId)}
                  >
                    <Chain chain={chain} fontClass="text-text-primary" />
                    <FootnoteText className="text-text-tertiary">
                      {chain.selectedAmount}/{chain.accounts.length}
                    </FootnoteText>
                  </Checkbox>

                  {/* chains accounts */}
                  <ul>
                    {chain.accounts.map((account) => (
                      <li key={account.id}>
                        <Checkbox
                          checked={account.isSelected}
                          className="py-0.5 ml-12"
                          onChange={(event) => selectAccount(event.target?.checked, account)}
                        >
                          <AddressWithExplorers
                            explorers={account.chainId && chains[account.chainId]?.explorers}
                            accountId={account.accountId}
                            addressPrefix={account.chainId && chains[account.chainId]?.addressPrefix}
                            name={account.name}
                          />
                        </Checkbox>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <Button className="ml-auto mt-7" onClick={handleSubmit}>
        {t('balances.shardsModalButton')}
      </Button>
    </BaseModal>
  );
};
