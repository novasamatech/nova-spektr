import { useI18n } from '@/app/providers';
import { FootnoteText, Icon } from '@/shared/ui';

// type Props = {
//   referendum: Referendum;
// };

// TODO implement
export const WalletVoted = () => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
