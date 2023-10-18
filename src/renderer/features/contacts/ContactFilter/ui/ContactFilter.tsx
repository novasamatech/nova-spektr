import { useEffect } from 'react';

import { SearchInput } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { filterModel } from '../model/contact-filter';

export const ContactFilter = () => {
  const { t } = useI18n();

  useEffect(() => {
    filterModel.events.componentMounted();
  }, []);

  return (
    <SearchInput
      className="w-[230px]"
      placeholder={t('addressBook.searchPlaceholder')}
      onChange={filterModel.events.queryChanged}
    />
  );
};
