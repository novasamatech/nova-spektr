import { orderBy } from 'lodash';

import { SortConfig, SortType, AnyRecord } from './types';

/**
 * Get sorted data based on current config
 * @param dataSource table data to be sorted
 * @param config columns' config with sorting params
 * @return {Array}
 */
export const getSortedData = <T extends AnyRecord>(dataSource: T[], config: SortConfig): T[] => {
  const activeSorting = Object.values(config).find((sort) => sort.active);

  if (!dataSource.length || !activeSorting) {
    return dataSource;
  }

  return orderBy(dataSource, [activeSorting.dataKey], [activeSorting.type]);
};

/**
 * Get sorted data based on current config
 * @param column name of the column to be sorted
 * @param config columns' config with sorting params
 * @return {Object}
 */
export const getActiveSorting = (column: string, config: SortConfig): SortConfig => {
  return Object.entries(config).reduce<SortConfig>((acc, [key, value]) => {
    const payload = { ...value, active: false, type: SortType.DESC };

    if (key === column) {
      payload.active = true;
      payload.type = value.type === SortType.DESC ? SortType.ASC : SortType.DESC;
    }
    acc[key] = payload;

    return acc;
  }, {});
};
