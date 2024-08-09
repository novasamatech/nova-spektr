import { useI18n } from '@/app/providers';
import { FootnoteText, Icon } from '@/shared/ui';

type Props = {
  active: boolean;
  votes?: string;
};

export const Voted = ({ active, votes }: Props) => {
  const { t } = useI18n();

  if (!active) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      {votes ? (
        <>
          <FootnoteText className="text-icon-accent">{t('governance.votedWithAmount')}</FootnoteText>
          <FootnoteText className="text-text-primary">{t('governance.referendum.votes', { votes })}</FootnoteText>
        </>
      ) : (
        <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
      )}
    </div>
  );
};
