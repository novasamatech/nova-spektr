import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { ChainId } from '@renderer/domain/shared-kernel';
import { UNKNOWN_TYPE, getStatusOptions, getTransactionOptions, TransferTypes } from '../common/utils';
import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { MultisigTransaction, MultisigTxStatus, TransactionType } from '@renderer/domain/transaction';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { MultiSelect } from '@renderer/components/ui-redesign';

type FiltersOptions = {
  statusOptions: Set<DropdownOption>;
  networkOptions: Set<DropdownOption>;
  typeOptions: Set<DropdownOption>;
};

const filtersEmptyValue: FiltersOptions = {
  statusOptions: new Set<DropdownOption>(),
  networkOptions: new Set<DropdownOption>(),
  typeOptions: new Set<DropdownOption>(),
};

type Props = {
  txs: MultisigTransactionDS[];
  onChangeFilters: (filteredTxs: MultisigTransaction[]) => void;
};

const Filters = ({ txs, onChangeFilters }: Props) => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();

  const [filteredTxs, setFilteredTxs] = useState<MultisigTransaction[]>([]);

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);

  const NetworkOptions = Object.values(connections).map((c) => ({
    id: c.chainId,
    value: c.chainId,
    element: c.name,
  }));

  const [activeNetworks, setActiveNetworks] = useState<DropdownResult<ChainId>[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<DropdownResult<MultisigTxStatus>[]>([]);
  const [activeOperationTypes, setActiveOperationTypes] = useState<
    DropdownResult<TransactionType | typeof UNKNOWN_TYPE>[]
  >([]);

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(filtersEmptyValue);

  const activeStatusesValues = activeStatuses.map((t) => t.value);
  const activeNetworksValues = activeNetworks.map((t) => t.value);
  const activeOperationTypesValues = activeOperationTypes.map((t) => t.value);

  const getFilterableType = (tx: MultisigTransaction): TransactionType | typeof UNKNOWN_TYPE => {
    let filterableType: TransactionType | typeof UNKNOWN_TYPE = UNKNOWN_TYPE;

    if (tx.transaction) {
      if (TransferTypes.includes(tx.transaction.type)) {
        filterableType = TransactionType.TRANSFER;
      } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
        filterableType = tx.transaction.args?.transactions?.[0]?.type;
      } else {
        filterableType = tx.transaction?.type;
      }
    }

    return filterableType;
  };

  const filterByStatuses = (t: MultisigTransaction) =>
    !activeStatuses.length || activeStatusesValues.includes(t.status);
  const filterByNetworks = (t: MultisigTransaction) =>
    !activeNetworks.length || activeNetworksValues.includes(t.chainId);
  const filterByTransactionTypes = (t: MultisigTransaction) =>
    !activeOperationTypes.length || activeOperationTypesValues.includes(getFilterableType(t));

  useEffect(() => {
    const filtered = txs.filter((t) => filterByStatuses(t) && filterByNetworks(t) && filterByTransactionTypes(t));

    onChangeFilters(filtered);
    setFilteredTxs(filtered);
  }, [txs, activeStatusesValues.length, activeNetworksValues.length, activeOperationTypesValues.length]);

  const getTransactionTypeOption = (tx: MultisigTransactionDS) => {
    return TransactionOptions.find((s) => s.value === getFilterableType(tx));
  };
  const getAvailableFiltersOptions = (transactions: MultisigTransaction[]) =>
    transactions.reduce(
      (acc, tx) => {
        const statusOption = StatusOptions.find((s) => s.value === tx.status);
        const networkOption = NetworkOptions.find((s) => s.value === tx.chainId);
        const typeOption = getTransactionTypeOption(tx);

        if (statusOption) acc.statusOptions.add(statusOption);
        if (networkOption) acc.networkOptions.add(networkOption);
        if (typeOption) acc.typeOptions.add(typeOption);

        return acc;
      },
      {
        statusOptions: new Set<DropdownOption>(),
        networkOptions: new Set<DropdownOption>(),
        typeOptions: new Set<DropdownOption>(),
      },
    );

  const changeFiltersOptions = (changedFilter: 'status' | 'network' | 'type') => {
    const availableOptions = getAvailableFiltersOptions(filteredTxs);
    setFiltersOptions((prevState) => ({
      statusOptions: changedFilter === 'status' ? prevState.statusOptions : availableOptions.statusOptions,
      networkOptions: changedFilter === 'network' ? prevState.networkOptions : availableOptions.networkOptions,
      typeOptions: changedFilter === 'type' ? prevState.typeOptions : availableOptions.typeOptions,
    }));
  };

  useEffect(() => setFiltersOptions(getAvailableFiltersOptions(txs)), [txs.length]);

  const { statusOptions, networkOptions, typeOptions } = filtersOptions;

  return (
    <div className="flex gap-2 my-4">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        selectedIds={activeStatuses.map(({ id }) => id)}
        options={[...statusOptions]}
        disabled={statusOptions.size === 1}
        onChange={(value) => {
          setActiveStatuses(value);
          changeFiltersOptions('status');
        }}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={activeNetworks.map(({ id }) => id)}
        options={[...networkOptions]}
        disabled={networkOptions.size === 1}
        onChange={(value) => {
          setActiveNetworks(value);
          changeFiltersOptions('network');
        }}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={activeOperationTypes.map(({ id }) => id)}
        options={[...typeOptions]}
        disabled={typeOptions.size === 1}
        onChange={(value) => {
          setActiveOperationTypes(value);
          changeFiltersOptions('type');
        }}
      />
    </div>
  );
};

export default Filters;
