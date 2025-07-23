import { useStoreMap, useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect } from '@/shared/ui';
import { type DropdownOption, type DropdownResult } from '@/shared/ui/types';
import { networkModel } from '@/entities/network';
import { type FilterName, type FiltersOptions, filter } from '../model/filter';
import { list } from '../model/list';
import { TxStatus, UNKNOWN_TYPE } from '../service/constants';
import { getAvailableFiltersOptions } from '../service/filter';

const EmptyOptions: FiltersOptions = {
  status: new Set<DropdownOption>(),
  network: new Set<DropdownOption>(),
  type: new Set<DropdownOption>(),
};

export const getStatusOptions = (t: TFunction) => {
  return [
    {
      id: TxStatus.VALID,
      value: TxStatus.VALID,
      element: t('basket.filter.valid'),
    },
    {
      id: TxStatus.FAILED,
      value: TxStatus.FAILED,
      element: t('basket.filter.failed'),
    },
    {
      id: TxStatus.UNAVAILABLE,
      value: TxStatus.UNAVAILABLE,
      element: t('basket.filter.unavailable'),
    },
  ];
};

export const getTransactionOptions = (t: TFunction) => {
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
      id: TransactionType.REVOTE,
      value: TransactionType.REVOTE,
      element: t('operations.titles.revote'),
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
      id: UNKNOWN_TYPE,
      value: UNKNOWN_TYPE,
      element: t('operations.titles.unknown'),
    },
  ];
};

export const BasketFilter = () => {
  const { t } = useI18n();

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(EmptyOptions);

  const selectedOptions = useUnit(filter.$selectedOptions);
  const basketTxs = useUnit(list.$all);
  const chains = useStoreMap(networkModel.$chains, chains => Object.values(chains));

  useEffect(() => {
    setFiltersOptions(getAvailableFiltersOptions(basketTxs, chains, t));
  }, [basketTxs, chains]);

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values };

    filter.selectedOptionsChanged(newSelectedOptions);
  };

  const clearFilters = () => {
    filter.selectedOptionsReset();
  };

  const filtersSelected =
    selectedOptions.network.length || selectedOptions.status.length || selectedOptions.type.length;

  return (
    <div className="flex h-9 w-[736px] items-center gap-2">
      <MultiSelect
        className="w-[210px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        disabled={!filtersOptions.type.size}
        selectedIds={selectedOptions.type.map(({ id }) => id)}
        options={[...filtersOptions.type]}
        onChange={value => handleFilterChange(value, 'type')}
      />
      <MultiSelect
        className="w-[135px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        disabled={!filtersOptions.network.size}
        selectedIds={selectedOptions.network.map(({ id }) => id)}
        options={[...filtersOptions.network]}
        onChange={value => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[173px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        disabled={!basketTxs.length}
        selectedIds={selectedOptions.status.map(({ id }) => id)}
        options={[...filtersOptions.status]}
        onChange={value => handleFilterChange(value, 'status')}
      />

      {Boolean(filtersSelected) && (
        <Button variant="text" className="ml-auto h-8.5 py-0" onClick={clearFilters}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </div>
  );
};
