import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui';
import { filterModel } from '../model/contact-filter';

export const ContactFilter = () => {
  const { t } = useI18n();

  useEffect(() => {
    filterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      wrapperClass="w-[280px]"
      placeholder={t('addressBook.searchPlaceholder')}
      onChange={filterModel.events.queryChanged}
    />
  );
};
