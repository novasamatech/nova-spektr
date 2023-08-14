import { SearchInput } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import * as filterModel from '../model/contact-filter';

export const ContactFilter = () => {
  const { t } = useI18n();

  return (
    <SearchInput
      className="w-[230px]"
      placeholder={t('addressBook.searchPlaceholder')}
      onChange={filterModel.events.setQuery}
    />
  );
};
