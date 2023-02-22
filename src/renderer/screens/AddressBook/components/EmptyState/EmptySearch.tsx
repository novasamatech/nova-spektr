import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const EmptyFilter = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center mt-10 mb-5">
      <Icon as="img" name="noResults" size={380} />
      <p className="text-neutral text-xl font-bold">{t('addressBook.contactList.emptySearchLabel')}</p>
      <p className="text-neutral-variant text-base font-normal">
        {t('addressBook.contactList.emptySearchDescription')}
      </p>
    </div>
  );
};

export default EmptyFilter;
