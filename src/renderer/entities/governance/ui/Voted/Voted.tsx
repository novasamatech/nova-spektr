import { Icon, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';

export const Voted = () => {
  const { t } = useI18n();

  return (
    <div className="flex gap-x-1 items-center">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
