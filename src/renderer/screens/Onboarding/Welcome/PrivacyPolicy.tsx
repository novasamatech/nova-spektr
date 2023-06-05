import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, InfoLink } from '@renderer/components/ui-redesign';

// TODO: use real links in future
const TERMS_AND_CONDITIONS = 'https://link_1.com';
const PRIVACY_POLICY = 'https://link_2.com';

const PrivacyPolicy = () => {
  const { t } = useI18n();

  const terms = <InfoLink className="px-1" url={TERMS_AND_CONDITIONS} showIcon={false} />;
  const privacy = <InfoLink className="px-1" url={PRIVACY_POLICY} showIcon={false} />;

  return (
    <FootnoteText className="flex items-center">
      <Trans t={t} i18nKey="onboarding.welcome.privacy" components={{ terms, privacy }} />
    </FootnoteText>
  );
};

export default PrivacyPolicy;
