import { Icon, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  active: boolean;
};

export const Voted = ({ active }: Props) => {
  const { t } = useI18n();

  if (!active) return null;

  return (
    <div className="flex gap-x-1 items-center">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
