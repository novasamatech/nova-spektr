import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';

type Props = {
  asset?: Asset;
};

const AboutStaking = ({ asset }: Props) => {
  const { t } = useI18n();

  return <Trans t={t} i18nKey="staking.overview.aboutStakingLabel" values={{ asset: asset?.symbol }} />;
};

export default AboutStaking;
