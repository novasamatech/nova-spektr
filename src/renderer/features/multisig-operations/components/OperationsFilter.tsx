import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo } from 'react';

import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, MultiSelect } from '@/shared/ui';
import { type DropdownOption, type DropdownResult } from '@/shared/ui/types';
import { Address } from '@/shared/ui-entities';
import { type DateRange, DateRangePicker } from '@/shared/ui-kit';
import { type MultisigOperation, multisigOperation, useAccountsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { operationsContextModel } from '../model/context';

type FilterName = 'account' | 'network' | 'type';

const getFilterableTxType = (op: MultisigOperation): TransactionType | 'UNKNOWN_TYPE' => {
  if (!op.transaction?.type) {
    return 'UNKNOWN_TYPE';
  }

  if (TransferTypes.includes(op.transaction.type)) {
    return TransactionType.TRANSFER;
  }
  if (XcmTypes.includes(op.transaction.type)) {
    return TransactionType.XCM_LIMITED_TRANSFER;
  }

  if (op.transaction.type === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(op.transaction);

    return txMatch?.type || 'UNKNOWN_TYPE';
  }

  return op.transaction.type;
};

export const OperationsFilter = memo(() => {
  const { t } = useI18n();

  const operations = useUnit(multisigOperation.$list);
  const selectedOptions = useUnit(operationsContextModel.$filter);
  const chains = useUnit(networkModel.$chains);
  const multisigAccountsMap = useUnit(operationsContextModel.$multisigAccountsMap);

  const multisigAccounts = useMemo(() => Array.from(multisigAccountsMap.values()), [multisigAccountsMap]);
  const resolvedMultisigAccounts = useAccountsNames(multisigAccounts);

  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = Object.values(chains).map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));

  const getAvailableNetworkAndTypeFiltersOptions = (
    transactions: MultisigOperation[],
    networkOptions: DropdownOption[],
    transactionOptions: DropdownOption[],
  ) => {
    return transactions.reduce(
      (acc, tx) => {
        const txType = getFilterableTxType(tx);
        const xcmDestination = tx.transaction?.args.destinationChain;

        const originNetworkOption = networkOptions.find(s => s.value === tx.chainId);
        const destNetworkOption = networkOptions.find(s => s.value === xcmDestination);
        const typeOption = transactionOptions.find(s => s.value === txType);

        if (originNetworkOption) {
          acc.network.add(originNetworkOption);
        }
        if (destNetworkOption) {
          acc.network.add(destNetworkOption);
        }
        if (typeOption) {
          acc.type.add(typeOption);
        }

        return acc;
      },
      {
        network: new Set<DropdownOption>(),
        type: new Set<DropdownOption>(),
      },
    );
  };

  const filtersOptions = useMemo(() => {
    const AccountOptions = resolvedMultisigAccounts.map(account => ({
      id: account.accountId,
      value: account.accountId,
      element: <Address showIcon variant="truncate" address={toAddress(account.accountId)} title={account.name} />,
    }));

    const networkAndTypeOptions = getAvailableNetworkAndTypeFiltersOptions(
      operations,
      NetworkOptions,
      TransactionOptions,
    );

    return {
      account: AccountOptions,
      ...networkAndTypeOptions,
    };
  }, [operations, resolvedMultisigAccounts, NetworkOptions, TransactionOptions]);

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

  const filtersSelected =
    selectedOptions.account.length ||
    selectedOptions.network.length ||
    selectedOptions.type.length ||
    selectedOptions.dateRange?.from ||
    selectedOptions.dateRange?.to;

  return (
    <div className="flex h-9 items-center gap-2">
      {Boolean(filtersSelected) && (
        <Button variant="text" className="h-8.5 py-0" onClick={clearFilters}>
          {t('operations.filters.clearAll')}
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
      />
      <MultiSelect
        className="w-[136px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network}
        options={[...filtersOptions.network]}
        onChange={value => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[136px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type}
        options={[...filtersOptions.type]}
        onChange={value => handleFilterChange(value, 'type')}
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
