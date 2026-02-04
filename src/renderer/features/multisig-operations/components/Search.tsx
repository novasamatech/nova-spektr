import { useStoreMap } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';
import { operationsContextModel } from '../model/context';

export const Search = () => {
  const { t } = useI18n();
  const searchQuery = useStoreMap({
    store: operationsContextModel.$filter,
    keys: [],
    fn: filter => filter.searchQuery ?? '',
  });

  return (
    <SearchInput
      value={searchQuery}
      placeholder={t('operations.searchPlaceholder')}
      onChange={value => operationsContextModel.setFilter({ searchQuery: value })}
    />
  );
};
