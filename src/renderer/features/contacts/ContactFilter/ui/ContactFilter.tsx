import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';
import { filterModel } from '../model/contact-filter';

export const ContactFilter = () => {
  const { t } = useI18n();

  const filterQuery = useUnit(filterModel.$filterQuery);

  useEffect(() => {
    filterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      placeholder={t('addressBook.searchPlaceholder')}
      value={filterQuery}
      onChange={filterModel.events.queryChanged}
    />
  );
};
