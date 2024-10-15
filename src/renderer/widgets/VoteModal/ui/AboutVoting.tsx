import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, SmallTitleText } from '@/shared/ui';

export const AboutVoting = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 whitespace-pre-line p-4">
      <div>
        <Trans
          t={t}
          i18nKey="governance.voting.aboutVoting"
          components={{
            header: <SmallTitleText />,
            p: <FootnoteText className="mt-2 text-text-secondary" />,
            ul: <FootnoteText className="ms-2 list-disc" />,
            li: <FootnoteText as="li" className="text-text-secondary" />,
          }}
        />
      </div>
      <div>
        <Trans
          t={t}
          i18nKey="governance.voting.aboutVotingPower"
          components={{
            header: <SmallTitleText />,
            p: <FootnoteText className="mt-2 text-text-secondary" />,
          }}
        />
      </div>
    </div>
  );
};
