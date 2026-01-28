import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo, useState } from 'react';

import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, performSearch, toAddress } from '@/shared/lib/utils';
import { Button, MultiSelect } from '@/shared/ui';
import { type DropdownResult } from '@/shared/ui/types';
import { Hash, WalletAccountIcon } from '@/shared/ui-entities';
import { type DateRange, DateRangePicker } from '@/shared/ui-kit';
import { accountService, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelectService } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';
import { operationsContextModel } from '../model/context';

type FilterName = 'account' | 'network' | 'type';

export const OperationsFilter = memo(() => {
  const { t } = useI18n();

  const selectedOptions = useUnit(operationsContextModel.$filter);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const chains = useUnit(networkModel.$chains);
  const multisigAccountsMap = useUnit(operationsContextModel.$multisigAccountsMap);
  const multisigWallets = useUnit(operationsContextModel.$multisigWallets);

  const resolvedWallets = useWalletsNames(multisigWallets);

  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [networkSearchQuery, setNetworkSearchQuery] = useState('');
  const [typeSearchQuery, setTypeSearchQuery] = useState('');

  const multisigAccounts = useMemo(() => Object.values(multisigAccountsMap), [multisigAccountsMap]);

  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = Object.values(chains).map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));

  const filtersOptions = useMemo(() => {
    const filteredAccountOptions = performSearch({
      query: accountSearchQuery,
      records: multisigAccounts
        .map(multisigAccount => {
          const wallet = resolvedWallets.find(w => w.id === multisigAccount.walletId);
          const addressPrefix =
            'chainId' in multisigAccount ? chains[multisigAccount.chainId]?.addressPrefix : undefined;
          const accountAddress = toAddress(multisigAccount.accountId, { prefix: addressPrefix });

          return wallet
            ? {
                multisigAccount,
                walletName: wallet.name,
                accountAddress,
                wallet,
              }
            : null;
        })
        .filter(nonNullable),
      getMeta: ({ walletName, wallet }) => ({
        name: walletName,
        address: walletSelectService.composeWalletMeta(
          wallet,
          accountService.filterAccountsByWallet(multisigAccounts, wallet.id),
          chains,
        ),
      }),
      weights: { name: 1, address: 0.8 },
    }).map(({ multisigAccount, walletName, accountAddress, wallet }) => ({
      id: multisigService.getMultisigAccountId(multisigAccount),
      value: multisigService.getMultisigAccountId(multisigAccount),
      element: (
        <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
          {wallet && <WalletAccountIcon address={accountAddress} type={wallet.type} size={24} iconSize={12} />}
          <span className="flex w-full flex-col overflow-hidden">
            {walletName && <span className="w-fit max-w-full truncate">{walletName}</span>}
            <span className="w-full text-help-text text-text-tertiary">
              <Hash value={accountAddress} variant="truncate" />
            </span>
          </span>
        </span>
      ),
    }));

    const filteredNetworkOptions = performSearch({
      query: networkSearchQuery,
      records: NetworkOptions,
      weights: { element: 1 },
    });

    const filteredTypeOptions = performSearch({
      query: typeSearchQuery,
      records: TransactionOptions,
      weights: { element: 1 },
    });

    return {
      account: filteredAccountOptions,
      network: filteredNetworkOptions,
      type: filteredTypeOptions,
    };
  }, [
    multisigAccounts,
    resolvedWallets,
    chains,
    NetworkOptions,
    TransactionOptions,
    accountSearchQuery,
    networkSearchQuery,
    typeSearchQuery,
  ]);

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values.map(v => v.id) };
    operationsContextModel.setFilters(newSelectedOptions);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const newSelectedOptions = { ...selectedOptions, dateRange: range };
    operationsContextModel.setFilters(newSelectedOptions);
  };

  const clearFilters = () => {
    operationsContextModel.resetFilters();
  };

  return (
    <div className="flex h-9 items-center gap-2">
      {isFiltersSelected && (
        <Button variant="text" className="h-8.5 py-0" onClick={clearFilters}>
          {t('operations.filters.clearFilters')}
        </Button>
      )}
      <div className="w-[136px]">
        <DateRangePicker
          value={selectedOptions.dateRange}
          placeholder={t('operations.filters.dateRangePlaceholder')}
          onChange={handleDateRangeChange}
        />
      </div>
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.accountPlaceholder')}
        selectedIds={selectedOptions.account}
        options={[...filtersOptions.account]}
        onChange={value => handleFilterChange(value, 'account')}
        onSearch={setAccountSearchQuery}
      />
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network}
        options={[...filtersOptions.network]}
        onChange={value => handleFilterChange(value, 'network')}
        onSearch={setNetworkSearchQuery}
      />
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type}
        options={[...filtersOptions.type]}
        onChange={value => handleFilterChange(value, 'type')}
        onSearch={setTypeSearchQuery}
      />
    </div>
  );
});

const getTransactionOptions = (t: TFunction) => {
  return [
    {
      id: TransactionType.TRANSFER,
      value: TransactionType.TRANSFER,
      element: t('operations.titles.transfer'),
    },
    {
      id: TransactionType.XCM_LIMITED_TRANSFER,
      value: TransactionType.XCM_LIMITED_TRANSFER,
      element: t('operations.titles.crossChainTransfer'),
    },
    {
      id: TransactionType.BOND,
      value: TransactionType.BOND,
      element: t('operations.titles.startStaking'),
    },
    {
      id: TransactionType.STAKE_MORE,
      value: TransactionType.STAKE_MORE,
      element: t('operations.titles.stakeMore'),
    },
    {
      id: TransactionType.DESTINATION,
      value: TransactionType.DESTINATION,
      element: t('operations.titles.destination'),
    },
    {
      id: TransactionType.NOMINATE,
      value: TransactionType.NOMINATE,
      element: t('operations.titles.nominate'),
    },
    {
      id: TransactionType.REDEEM,
      value: TransactionType.REDEEM,
      element: t('operations.titles.redeem'),
    },
    {
      id: TransactionType.RESTAKE,
      value: TransactionType.RESTAKE,
      element: t('operations.titles.restake'),
    },
    {
      id: TransactionType.UNSTAKE,
      value: TransactionType.UNSTAKE,
      element: t('operations.titles.unstake'),
    },
    {
      id: TransactionType.ADD_PROXY,
      value: TransactionType.ADD_PROXY,
      element: t('operations.titles.addProxy'),
    },
    {
      id: TransactionType.REMOVE_PROXY,
      value: TransactionType.REMOVE_PROXY,
      element: t('operations.titles.removeProxy'),
    },
    {
      id: TransactionType.CREATE_PURE_PROXY,
      value: TransactionType.CREATE_PURE_PROXY,
      element: t('operations.titles.createPureProxy'),
    },
    {
      id: TransactionType.KILL_PURE_PROXY,
      value: TransactionType.KILL_PURE_PROXY,
      element: t('operations.titles.removePureProxy'),
    },
    {
      id: TransactionType.UNLOCK,
      value: TransactionType.UNLOCK,
      element: t('operations.titles.unlock'),
    },
    {
      id: TransactionType.VOTE,
      value: TransactionType.VOTE,
      element: t('operations.titles.vote'),
    },
    {
      id: TransactionType.REMOVE_VOTE,
      value: TransactionType.REMOVE_VOTE,
      element: t('operations.titles.removeVote'),
    },
    {
      id: TransactionType.DELEGATE,
      value: TransactionType.DELEGATE,
      element: t('operations.titles.delegate'),
    },
    {
      id: TransactionType.UNDELEGATE,
      value: TransactionType.UNDELEGATE,
      element: t('operations.titles.undelegate'),
    },
    {
      id: 'UNKNOWN_TYPE',
      value: 'UNKNOWN_TYPE',
      element: t('operations.titles.unknown'),
    },
  ];
};
