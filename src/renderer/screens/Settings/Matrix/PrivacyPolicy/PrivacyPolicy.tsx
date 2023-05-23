import { Trans } from 'react-i18next';

import { Icon, InfoLink } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

// TODO: use real links in future
const TERMS_AND_CONDITIONS = 'https://link_1.com';
const PRIVACY_POLICY = 'https://link_2.com';

const PrivacyPolicy = () => {
  const { t } = useI18n();

  const terms = <InfoLink url={TERMS_AND_CONDITIONS} showIcon={false} />;
  const privacy = <InfoLink url={PRIVACY_POLICY} showIcon={false} />;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-x-1 text-neutral">
        <Icon name="bell" size={20} />
        <p>{t('settings.matrix.privacyTitle')}</p>
      </div>
      <p className="flex gap-x-1 text-xs text-neutral-variant">
        <Trans t={t} i18nKey="settings.matrix.privacyFooter" components={{ terms, privacy }} />
      </p>
    </div>
  );
};

export default PrivacyPolicy;
