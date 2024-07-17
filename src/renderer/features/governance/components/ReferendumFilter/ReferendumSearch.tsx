import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';

import { SearchInput } from '@shared/ui';

import { filterModel } from '../../model/filter';

export const ReferendumSearch = () => {
  const { t } = useI18n();
  const query = useUnit(filterModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('governance.searchPlaceholder')}
      wrapperClass="w-[230px]"
      onChange={filterModel.events.queryChanged}
    />
  );
};
