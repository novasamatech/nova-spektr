import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Indicator } from '@/shared/ui-kit';

type Props = {
  isActive: boolean;
};

export const ActiveIndicator = ({ isActive }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1">
      <Indicator active={isActive} />
      <FootnoteText>{t(isActive ? 'fellowship.profile.active' : 'fellowship.profile.inactive')}</FootnoteText>
    </div>
  );
};
