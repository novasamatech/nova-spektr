import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect } from '@/shared/ui';
import { type DropdownOption, type DropdownResult } from '@/shared/ui/types';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { operationsContextModel } from '../model/context';

type FilterName = 'status' | 'network' | 'type';

type FiltersOptions = Record<FilterName, Set<DropdownOption>>;

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

const EmptyOptions: FiltersOptions = {
  status: new Set<DropdownOption>(),
  network: new Set<DropdownOption>(),
  type: new Set<DropdownOption>(),
};

type Props = {
  operations: MultisigOperation[];
};

export const OperationsFilter = ({ operations }: Props) => {
  const { t } = useI18n();

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(EmptyOptions);

  const selectedOptions = useUnit(operationsContextModel.$filter);
  const chains = useUnit(networkModel.$chains);

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = Object.values(chains).map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));

  useEffect(() => {
    setFiltersOptions(getAvailableFiltersOptions(operations));
  }, [operations, chains]);

  const getAvailableFiltersOptions = (transactions: MultisigOperation[]) => {
    return transactions.reduce(
      (acc, tx) => {
        const txType = getFilterableTxType(tx);
        const xcmDestination = tx.transaction?.args.destinationChain;

        const statusOption = StatusOptions.find(s => s.value === tx.status);
        const originNetworkOption = NetworkOptions.find(s => s.value === tx.chainId);
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

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values.map(v => v.id) };
    operationsContextModel.setFilters(newSelectedOptions);
  };

  const clearFilters = () => {
    operationsContextModel.resetFilters();
  };

  const filtersSelected =
    selectedOptions.network.length || selectedOptions.status.length || selectedOptions.type.length;

  return (
    <div className="my-4 ml-6 flex h-9 w-[736px] items-center gap-2">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        selectedIds={selectedOptions.status}
        options={[...filtersOptions.status]}
        onChange={value => handleFilterChange(value, 'status')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network}
        options={[...filtersOptions.network]}
        onChange={value => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type}
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

const getStatusOptions = (t: TFunction): DropdownOption<MultisigOperation['status']>[] => {
  return [
    {
      id: 'pending',
      value: 'pending',
      element: t('operation.status.signing'),
    },
    {
      id: 'cancelled',
      value: 'cancelled',
      element: t('operation.status.cancelled'),
    },
    {
      id: 'error',
      value: 'error',
      element: t('operation.status.error'),
    },
    {
      id: 'executed',
      value: 'executed',
      element: t('operation.status.executed'),
    },
  ];
};

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
