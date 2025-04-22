import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';

type Props = {
  voted: boolean;
};

export const VoteBadge = ({ voted }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex items-center gap-x-1', voted ? 'text-icon-accent' : 'text-text-secondary')}>
      <Icon name="voted" size={16} className="shrink-0 text-inherit" />
      <FootnoteText className="text-inherit">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
