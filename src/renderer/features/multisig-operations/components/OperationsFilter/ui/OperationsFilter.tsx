import { useEffect, useState } from 'react';

import { chainsService } from '@/shared/api/network';
import { type ChainId, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect } from '@/shared/ui';
import { type DropdownOption, type DropdownResult } from '@/shared/ui/types';
import { type MultisigOperation } from '@/domains/network';
import { operationDetailsUtils } from '@/entities/operations';
import { TransferTypes, XcmTypes, getTransactionType } from '@/entities/transaction';
import { list } from '../../../model/list';
import { getStatusOptions, getTransactionOptions } from '../lib/utils';

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
  txs: MultisigOperation[];
};

export const OperationsFilter = ({ txs }: Props) => {
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
    list.changeFilteredTxs(txs);
  }, [txs, availableChains]);

  const getFilterableTxType = (operation: MultisigOperation): TransactionType | 'UNKNOWN_TYPE' => {
    if (!operation.method || !operation.section) {
      return 'UNKNOWN_TYPE';
    }

    const transactionType = getTransactionType(operation.method, operation.section);

    if (!transactionType) {
      return 'UNKNOWN_TYPE';
    }

    if (TransferTypes.includes(transactionType)) {
      return TransactionType.TRANSFER;
    }
    if (XcmTypes.includes(transactionType)) {
      return TransactionType.XCM_LIMITED_TRANSFER;
    }

    // TODO: Fix batch all
    // if (transactionType === TransactionType.BATCH_ALL) {
    //   const txMatch = findCoreBatchAll(tx.transaction);

    //   return txMatch?.type || 'UNKNOWN_TYPE';
    // }

    return transactionType;
  };

  const getAvailableFiltersOptions = (operations: MultisigOperation[]) => {
    return operations.reduce(
      (acc, operation) => {
        const txType = getFilterableTxType(operation);
        const xcmDestination = operation.transaction
          ? operationDetailsUtils.getDestinationChain(operation.transaction)
          : null;

        const statusOption = StatusOptions.find(s => s.value === operation.status);
        const originNetworkOption = NetworkOptions.find(s => s.value === operation.chainId);
        const destNetworkOption = NetworkOptions.find(s => s.value === xcmDestination);
        const typeOption = TransactionOptions.find(s => s.value === txType);

        if (statusOption) {
          acc.status.add(statusOption);
        }
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
        status: new Set<DropdownOption>(),
        network: new Set<DropdownOption>(),
        type: new Set<DropdownOption>(),
      },
    );
  };

  const filterTx = (operation: MultisigOperation, filters: SelectedFilters) => {
    const hasStatus = !filters.status.length || filters.status.map(mapValues).includes(operation.status);
    const hasOrigin = !filters.network.length || filters.network.map(mapValues).includes(operation.chainId);

    const hasTxType = !filters.type.length || filters.type.map(mapValues).includes(getFilterableTxType(operation));

    if (hasStatus && hasTxType) {
      if (hasOrigin) {
        return true;
      }
      const xcmDestination = operation.transaction
        ? operationDetailsUtils.getDestinationChain(operation.transaction)
        : null;
      const hasDestination = !filters.network.length || filters.network.map(mapValues).includes(xcmDestination);
      return hasDestination;
    }

    return false;
  };

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values };
    setSelectedOptions(newSelectedOptions);

    const filteredTxs = txs.filter(tx => filterTx(tx, newSelectedOptions));
    list.changeFilteredTxs(filteredTxs);
  };

  const clearFilters = () => {
    setSelectedOptions(EmptySelected);
    list.changeFilteredTxs(txs);
  };

  const filtersSelected =
    selectedOptions.network.length || selectedOptions.status.length || selectedOptions.type.length;

  return (
    <div className="my-4 ml-6 flex h-9 w-[736px] items-center gap-2">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        selectedIds={selectedOptions.status.map(({ id }) => id)}
        options={[...filtersOptions.status]}
        onChange={value => handleFilterChange(value, 'status')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network.map(({ id }) => id)}
        options={[...filtersOptions.network]}
        onChange={value => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type.map(({ id }) => id)}
        options={[...filtersOptions.type]}
        onChange={value => handleFilterChange(value, 'type')}
      />

      {Boolean(filtersSelected) && (
        <Button variant="text" className="ml-auto h-8.5 py-0" onClick={clearFilters}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </div>
  );
};
