import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/context/I18nContext';
import { InfoLink } from '@renderer/components/ui';

const MATRIX = 'https://link_1.com';
const SMP = 'https://link_2.com';

const InfoSection = () => {
  const { t } = useI18n();

  const matrix = <InfoLink url={MATRIX} showIcon={false} />;
  const smp = <InfoLink url={SMP} showIcon={false} />;

  return (
    <div>
      <h3 className="text-neutral font-semibold text-sm mb-2.5">{t('settings.matrix.infoWhyMatrixTitle')}</h3>
      <p className="text-neutral-variant text-xs">{t('settings.matrix.infoSpektrDescription')}</p>
      <h3 className="text-neutral font-semibold text-sm mt-7.5 mb-2.5">{t('settings.matrix.infoWhatIsMatrixTitle')}</h3>
      <p className="text-neutral-variant text-xs">
        <Trans t={t} i18nKey="settings.matrix.infoMatrixDescription" components={{ matrix, smp }} />
      </p>
      <ol className="list-decimal text-neutral-variant text-xs ml-4">
        <li>{t('settings.matrix.infoMatrixDescriptionOne')}</li>
        <li>{t('settings.matrix.infoMatrixDescriptionTwo')}</li>
      </ol>
      <p className="text-neutral-variant text-xs mt-2.5">{t('settings.matrix.infoMatrixEncryption')}</p>
    </div>
  );
};

export default InfoSection;
