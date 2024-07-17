import { useEffect } from 'react';

import { useI18n } from '@app/providers';

import { SearchInput } from '@shared/ui';

import { filterModel } from '../model/contact-filter';

export const ContactFilter = () => {
  const { t } = useI18n();

  useEffect(() => {
    filterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      className="w-[230px]"
      placeholder={t('addressBook.searchPlaceholder')}
      onChange={filterModel.events.queryChanged}
    />
  );
};
