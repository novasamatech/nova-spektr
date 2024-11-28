import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui';
import { assetsSearchModel } from '../model/assets-search-model';

export const AssetsSearch = () => {
  const { t } = useI18n();

  const query = useUnit(assetsSearchModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('balances.searchPlaceholder')}
      wrapperClass="w-[280px]"
      onChange={assetsSearchModel.events.queryChanged}
    />
  );
};
