import { useI18n } from '@renderer/context/I18nContext';

const AddressBook = () => {
  const { t } = useI18n();

  return <div>{t('addressBook.title')}</div>;
};

export default AddressBook;
