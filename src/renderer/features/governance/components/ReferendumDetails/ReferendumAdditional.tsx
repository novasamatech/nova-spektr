import { type ReferendumId } from '@shared/core';
import { FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  referendumId: ReferendumId;
  network: string;
};

export const ReferendumAdditional = ({ network, referendumId }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <a
        className="flex items-center gap-1.5 px-1.5 py-1"
        href={t('governance.additional.polkassemblyLink', { network, referendumId })}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="polkassembly" size={16} />
        <FootnoteText as="span" className="text-text-secondary">
          {t('governance.additional.polkassemblyLinkTitle')}
        </FootnoteText>
      </a>
      <a
        className="flex items-center gap-1.5 px-1.5 py-1"
        href={t('governance.additional.subsquareLink', { network, referendumId })}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="subsquare" size={16} />
        <FootnoteText as="span" className="text-text-secondary">
          {t('governance.additional.subsquareLinkTitle')}
        </FootnoteText>
      </a>
    </div>
  );
};
