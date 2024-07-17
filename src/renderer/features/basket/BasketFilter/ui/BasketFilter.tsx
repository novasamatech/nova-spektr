import { useEffect, useState } from 'react';
import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type DropdownOption, type DropdownResult } from '@shared/ui/types';
import { Button, MultiSelect } from '@shared/ui';
import { getAvailableFiltersOptions } from '../lib/utils';
import { type FilterName, type FiltersOptions } from '../common/types';
import { basketFilterModel } from '../model/baket-filter-model';
import { networkModel } from '@entities/network';

const EmptyOptions: FiltersOptions = {
  status: new Set<DropdownOption>(),
  network: new Set<DropdownOption>(),
  type: new Set<DropdownOption>(),
};

export const BasketFilter = () => {
  const { t } = useI18n();

  const [filtersOptions, setFiltersOptions] = useState<FiltersOptions>(EmptyOptions);

  const selectedOptions = useUnit(basketFilterModel.$selectedOptions);
  const basketTxs = useUnit(basketFilterModel.$basketTxs);
  const chains = useStoreMap(networkModel.$chains, (chains) => Object.values(chains));

  useEffect(() => {
    setFiltersOptions(getAvailableFiltersOptions(basketTxs, chains, t));
  }, [basketTxs, chains]);

  const handleFilterChange = (values: DropdownResult[], filterName: FilterName) => {
    const newSelectedOptions = { ...selectedOptions, [filterName]: values };

    basketFilterModel.events.selectedOptionsChanged(newSelectedOptions);
  };

  const clearFilters = () => {
    basketFilterModel.events.selectedOptionsReset();
  };

  const filtersSelected =
    selectedOptions.network.length || selectedOptions.status.length || selectedOptions.type.length;

  return (
    <div className="flex items-center gap-2 w-[736px] h-9 ">
      <MultiSelect
        className="w-[210px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        disabled={!filtersOptions.type.size}
        selectedIds={selectedOptions.type.map(({ id }) => id)}
        options={[...filtersOptions.type]}
        onChange={(value) => handleFilterChange(value, 'type')}
      />
      <MultiSelect
        className="w-[135px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        disabled={!filtersOptions.network.size}
        selectedIds={selectedOptions.network.map(({ id }) => id)}
        options={[...filtersOptions.network]}
        onChange={(value) => handleFilterChange(value, 'network')}
      />
      <MultiSelect
        className="w-[173px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        disabled={!basketTxs.length}
        selectedIds={selectedOptions.status.map(({ id }) => id)}
        options={[...filtersOptions.status]}
        onChange={(value) => handleFilterChange(value, 'status')}
      />

      {Boolean(filtersSelected) && (
        <Button variant="text" className="ml-auto py-0 h-8.5" onClick={clearFilters}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </div>
  );
};
