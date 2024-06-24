import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { SearchInput } from '@shared/ui';
import { referendumFilterModel } from '../model/referendum-filter-model';

export const ReferendumFilter = () => {
  const { t } = useI18n();
  const query = useUnit(referendumFilterModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('governance.searchPlaceholder')}
      wrapperClass="w-[230px]"
      onChange={referendumFilterModel.events.queryChanged}
    />
  );
};
