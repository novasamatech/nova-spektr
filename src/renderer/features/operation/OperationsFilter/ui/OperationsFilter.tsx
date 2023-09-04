import { useEffect, useState } from 'react';

import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/types';
import { MultisigTransaction, Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { Button, MultiSelect } from '@renderer/shared/ui';
import { getStatusOptions, getTransactionOptions } from '../lib/utils';
import { UNKNOWN_TYPE, TransferTypes, XcmTypes } from '../lib/constants';

type FilterName = 'status' | 'network' | 'type';

type FiltersOptions = Record<FilterName, Set<DropdownOption>>;
type SelectedFilters = Record<FilterName, DropdownResult[]>;

const EmptyOptions: FiltersOptions = {
  status: new Set<DropdownOption>(),
  network: new Set<DropdownOption>(),
  type: new Set<DropdownOption>(),
};

const EmptySelected: SelectedFilters = {
  status: [],
  network: [],
  type: [],
};

const mapValues = (result: DropdownResult) => result.value;

type Props = {
  txs: MultisigTransactionDS[];
  onChange: (filteredTxs: MultisigTransaction[]) => void;
};

export const OperationsFilter = ({ txs, onChange }: Props) => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = Object.values(connections).map((c) => ({
    id: c.chainId,
    value: c.chainId,
    element: c.name,
  }));

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(EmptyOptions);
  const [selectedOptions, setSelectedOptions] = useState<SelectedFilters>(EmptySelected);

  useEffect(() => {
    setFiltersOptions(getAvailableFiltersOptions(txs));
    onChange(txs);
  }, [txs]);

  const getFilterableType = (tx: MultisigTransaction): TransactionType | typeof UNKNOWN_TYPE => {
    if (!tx.transaction?.type) return UNKNOWN_TYPE;

    if (TransferTypes.includes(tx.transaction.type)) return TransactionType.TRANSFER;
    if (XcmTypes.includes(tx.transaction.type)) return TransactionType.XCM_LIMITED_TRANSFER;

    if (tx.transaction.type === TransactionType.BATCH_ALL) {
      const txMatch = tx.transaction.args?.transactions?.find((tx: Transaction) => {
        return tx.type === TransactionType.BOND || tx.type === TransactionType.UNSTAKE;
      });

      return txMatch?.type || UNKNOWN_TYPE;
    }

    return tx.transaction.type;
  };

  const getTransactionTypeOption = (tx: MultisigTransaction) => {
    return TransactionOptions.find((s) => s.value === getFilterableType(tx));
  };

  const getAvailableFiltersOptions = (transactions: MultisigTransaction[]) => {
    return transactions.reduce(
      (acc, tx) => {
        const statusOption = StatusOptions.find((s) => s.value === tx.status);
        const networkOption = NetworkOptions.find((s) => s.value === tx.chainId);
        const typeOption = getTransactionTypeOption(tx);

        if (statusOption) acc.status.add(statusOption);
        if (networkOption) acc.network.add(networkOption);
        if (typeOption) acc.type.add(typeOption);

        return acc;
      },
      {
        status: new Set<DropdownOption>(),
        network: new Set<DropdownOption>(),
        type: new Set<DropdownOption>(),
      },
    );
  };

  const filterTx = (tx: MultisigTransaction, filters: SelectedFilters) => {
    return (
      (!filters.status.length || filters.status.map(mapValues).includes(tx.status)) &&
      (!filters.network.length || filters.network.map(mapValues).includes(tx.chainId)) &&
      (!filters.type.length || filters.type.map(mapValues).includes(getFilterableType(tx)))
    );
  };

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values };
    setSelectedOptions(newSelectedOptions);

    const filteredTxs = txs.filter((tx) => filterTx(tx, newSelectedOptions));
    onChange(filteredTxs);
  };

  const clearFilters = () => {
    setSelectedOptions(EmptySelected);
    onChange(txs);
  };

  const filtersSelected =
    selectedOptions.network.length || selectedOptions.status.length || selectedOptions.type.length;

  return (
    <div className="flex items-center gap-2 my-4 w-[736px] h-9 ml-6">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        selectedIds={selectedOptions.status.map(({ id }) => id)}
        options={[...filtersOptions.status]}
        onChange={(value) => handleFilterChange(value, 'status')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network.map(({ id }) => id)}
        options={[...filtersOptions.network]}
        onChange={(value) => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type.map(({ id }) => id)}
        options={[...filtersOptions.type]}
        onChange={(value) => handleFilterChange(value, 'type')}
      />

      {Boolean(filtersSelected) && (
        <Button variant="text" className="ml-auto py-0 h-8.5" onClick={clearFilters}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </div>
  );
};
