import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  test?: string;
};

const AboutStaking = ({ test }: Props) => {
  const { t } = useI18n();

  return <Trans t={t} i18nKey="staking.overview.aboutStakingLabel" values={{ asset: 'DOT' }} />;
};

export default AboutStaking;
