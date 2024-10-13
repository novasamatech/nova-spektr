import { Trans } from 'react-i18next';

import { useI18n } from '@/app/providers';
import { FootnoteText, InfoLink } from '@/shared/ui';

const TERMS_AND_CONDITIONS = 'https://novaspektr.io/terms';
const PRIVACY_POLICY = 'https://novaspektr.io/privacy';

const PrivacyPolicy = () => {
  const { t } = useI18n();

  const terms = <InfoLink className="px-1" url={TERMS_AND_CONDITIONS} />;
  const privacy = <InfoLink className="px-1" url={PRIVACY_POLICY} />;

  return (
    <FootnoteText className="flex items-center">
      <Trans t={t} i18nKey="onboarding.welcome.privacy" components={{ terms, privacy }} />
    </FootnoteText>
  );
};

export default PrivacyPolicy;
