import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  test?: string;
};

const InfoBanners = ({ test }: Props) => {
  const { t } = useI18n();

  return <div>{t('staking.overview.filterButton')}</div>;
};

export default InfoBanners;
