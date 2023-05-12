import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { UNKNOWN_TYPE, getStatusOptions, getTransactionOptions, TransferTypes } from '../common/utils';
import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { MultisigTransaction, TransactionType } from '@renderer/domain/transaction';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { MultiSelect } from '@renderer/components/ui-redesign';

type FilterNames = 'status' | 'network' | 'type';

type FiltersOptions = Record<FilterNames, Set<DropdownOption>>;
type SelectedFilters = Record<FilterNames, DropdownResult[]>;

const emptyOptions: FiltersOptions = {
  status: new Set<DropdownOption>(),
  network: new Set<DropdownOption>(),
  type: new Set<DropdownOption>(),
};

const emptySelected: SelectedFilters = {
  status: [],
  network: [],
  type: [],
};

type Props = {
  onChangeFilters: (filteredTxs: MultisigTransaction[]) => void;
};

const Filters = ({ onChangeFilters }: Props) => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);

  const NetworkOptions = Object.values(connections).map((c) => ({
    id: c.chainId,
    value: c.chainId,
    element: c.name,
  }));

  const { getActiveAccounts } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(emptyOptions);
  const [selectedOptions, setSelectedOptions] = useState<SelectedFilters>(emptySelected);

  const accounts = getActiveAccounts({ signingType: SigningType.MULTISIG });
  const accountIds = accounts.map((a) => a.accountId).filter(nonNullable);

  const txs = getLiveAccountMultisigTxs(accountIds);

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

  const getTransactionTypeOption = (tx: MultisigTransactionDS) => {
    return TransactionOptions.find((s) => s.value === getFilterableType(tx));
  };

  const getAvailableFiltersOptions = (transactions: MultisigTransaction[]) =>
    transactions.reduce(
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

  useEffect(() => setFiltersOptions(getAvailableFiltersOptions(txs)), [txs.length]);

  const mapValues = (result: DropdownResult) => result.value;

  const filterTx = (t: MultisigTransaction, filters: SelectedFilters) =>
    (!filters.status.length || filters.status.map(mapValues).includes(t.status)) &&
    (!filters.network.length || filters.network.map(mapValues).includes(t.chainId)) &&
    (!filters.type.length || filters.type.map(mapValues).includes(getFilterableType(t)));

  const handleFilterChange = (values: DropdownResult[], filter: FilterNames) => {
    const newSelectedOptions = { ...selectedOptions, [filter]: values };
    setSelectedOptions(newSelectedOptions);

    const filteredTxs = txs.filter((t) => filterTx(t, newSelectedOptions));
    onChangeFilters(filteredTxs);

    const filterOptionsFromTx = getAvailableFiltersOptions(filteredTxs);

    setFiltersOptions((prevState) => ({
      status: filter === 'status' ? prevState.status : filterOptionsFromTx.status,
      network: filter === 'network' ? prevState.network : filterOptionsFromTx.network,
      type: filter === 'type' ? prevState.type : filterOptionsFromTx.type,
    }));
  };

  return (
    <div className="flex gap-2 my-4 pl-6">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        selectedIds={selectedOptions.status.map(({ id }) => id)}
        options={[...filtersOptions.status]}
        disabled={filtersOptions.status.size === 1}
        onChange={(value) => handleFilterChange(value, 'status')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network.map(({ id }) => id)}
        options={[...filtersOptions.network]}
        disabled={filtersOptions.network.size === 1}
        onChange={(value) => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type.map(({ id }) => id)}
        options={[...filtersOptions.type]}
        disabled={filtersOptions.type.size === 1}
        onChange={(value) => handleFilterChange(value, 'type')}
      />
    </div>
  );
};

export default Filters;
