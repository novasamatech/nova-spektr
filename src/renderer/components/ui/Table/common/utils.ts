import { orderBy } from 'lodash';

import { AnyRecord, SortConfig, SortType } from './types';

/**
 * Get sorted data based on current config
 * @param dataSource table data to be sorted
 * @param config columns' config with sorting params
 * @return {Array}
 */
export const getSortedData = <T extends AnyRecord>(dataSource: T[], config: SortConfig): T[] => {
  const activeSorting = Object.values(config).find((sort) => sort.sortType !== SortType.NONE);

  if (!dataSource.length || !activeSorting || activeSorting.sortType === SortType.NONE) {
    return dataSource;
  }

  if (typeof activeSorting.sortable === 'function') {
    const sortedData = dataSource.slice().sort(activeSorting.sortable);

    return activeSorting.sortType === SortType.ASC ? sortedData : sortedData.reverse();
  }

  return orderBy(dataSource, [activeSorting.dataKey], [activeSorting.sortType]);
};

/**
 * Get updated config with only one sorted column
 * @param column name of the column to be sorted
 * @param config columns' config with sorting params
 * @return {Object}
 */
export const getUpdatedConfig = (column: string, config: SortConfig): SortConfig => {
  return Object.entries(config).reduce<SortConfig>((acc, [key, value]) => {
    const payload = { ...value, sortType: SortType.NONE };

    if (key === column) {
      payload.sortType = [SortType.DESC, SortType.NONE].includes(value.sortType) ? SortType.ASC : SortType.DESC;
    }
    acc[key] = payload;

    return acc;
  }, {});
};
