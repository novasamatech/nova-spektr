import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';
import { networksFilterModel } from '../model/networks-filter-model';

export const NetworksFilter = () => {
  const { t } = useI18n();

  const filterQuery = useUnit(networksFilterModel.$filterQuery);

  useEffect(() => {
    networksFilterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      value={filterQuery}
      placeholder={t('settings.networks.searchPlaceholder')}
      onChange={networksFilterModel.events.queryChanged}
    />
  );
};
