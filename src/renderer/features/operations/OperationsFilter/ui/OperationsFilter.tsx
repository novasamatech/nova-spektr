import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type MultisigTransactionDS } from '@shared/api/storage';
import { type DropdownOption, type DropdownResult } from '@shared/ui/types';
import { Button, MultiSelect } from '@shared/ui';
import { type ChainId, type MultisigTransaction, type Transaction, TransactionType } from '@shared/core';
import { TransferTypes, XcmTypes } from '@entities/transaction/lib/common/constants';
import { getStatusOptions, getTransactionOptions } from '../lib/utils';
import { UNKNOWN_TYPE } from '../lib/constants';
import { chainsService } from '@shared/api/network';

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

  const [availableChains, setAvailableChains] = useState<{ chainId: ChainId; name: string }[]>([]);
  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(EmptyOptions);
  const [selectedOptions, setSelectedOptions] = useState<SelectedFilters>(EmptySelected);

  useEffect(() => {
    const chains = chainsService.getChainsData().map(({ chainId, name }) => ({ chainId, name }));

    setAvailableChains(chains);
  }, []);

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = availableChains.map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));

  useEffect(() => {
    setFiltersOptions(getAvailableFiltersOptions(txs));
    onChange(txs);
  }, [txs, availableChains]);

  const getFilterableTxType = (tx: MultisigTransaction): TransactionType | typeof UNKNOWN_TYPE => {
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

  const getAvailableFiltersOptions = (transactions: MultisigTransaction[]) => {
    return transactions.reduce(
      (acc, tx) => {
        const txType = getFilterableTxType(tx);
        const xcmDestination = tx.transaction?.args.destinationChain;

        const statusOption = StatusOptions.find((s) => s.value === tx.status);
        const originNetworkOption = NetworkOptions.find((s) => s.value === tx.chainId);
        const destNetworkOption = NetworkOptions.find((s) => s.value === xcmDestination);
        const typeOption = TransactionOptions.find((s) => s.value === txType);

        if (statusOption) acc.status.add(statusOption);
        if (originNetworkOption) acc.network.add(originNetworkOption);
        if (destNetworkOption) acc.network.add(destNetworkOption);
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
    const xcmDestination = tx.transaction?.args.destinationChain;

    const hasStatus = !filters.status.length || filters.status.map(mapValues).includes(tx.status);
    const hasOrigin = !filters.network.length || filters.network.map(mapValues).includes(tx.chainId);
    const hasDestination = !filters.network.length || filters.network.map(mapValues).includes(xcmDestination);
    const hasTxType = !filters.type.length || filters.type.map(mapValues).includes(getFilterableTxType(tx));

    return hasStatus && (hasOrigin || hasDestination) && hasTxType;
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
