import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  test?: string;
};

const Transfer = ({ test }: Props) => {
  const { t } = useI18n();

  return <div>{t('transfers.title')}</div>;
};

export default Transfer;
