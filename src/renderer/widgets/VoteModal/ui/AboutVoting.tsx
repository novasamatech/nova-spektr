import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { FootnoteText, SmallTitleText } from '@shared/ui';

export const AboutVoting = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 p-4 whitespace-pre-line">
      <div>
        <Trans
          t={t}
          i18nKey="governance.voting.aboutVoting"
          components={{
            header: <SmallTitleText />,
            p: <FootnoteText className="text-text-secondary mt-2" />,
            ul: <FootnoteText className="list-disc ms-2" />,
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
            p: <FootnoteText className="text-text-secondary mt-2" />,
          }}
        />
      </div>
    </div>
  );
};
