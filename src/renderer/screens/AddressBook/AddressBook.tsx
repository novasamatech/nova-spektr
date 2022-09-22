import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  test?: string;
};

const AddressBook = ({ test }: Props) => {
  const { t } = useI18n();

  return <div>{t("addressBook.title")}</div>;
};

export default AddressBook;
