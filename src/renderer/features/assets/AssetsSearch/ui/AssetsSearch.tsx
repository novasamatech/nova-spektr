import { useUnit } from 'effector-react';

import { SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';
import { assetsSearchModel } from '../model/assets-search-model';

export const AssetsSearch = () => {
  const { t } = useI18n();

  const query = useUnit(assetsSearchModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('balances.searchPlaceholder')}
      className="w-[230px]"
      onChange={assetsSearchModel.events.queryChanged}
    />
  );
};
