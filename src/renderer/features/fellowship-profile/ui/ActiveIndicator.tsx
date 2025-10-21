import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';

type Props = {
  isActive: boolean;
};

const COLORS = {
  active: {
    outer: 'bg-icon-positive/30',
    inner: 'bg-icon-positive',
  },
  inactive: {
    outer: 'bg-chip-text/30',
    inner: 'bg-chip-text',
  },
};

export const ActiveIndicator = ({ isActive }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex h-4 w-4 items-center justify-center">
        <div
          className={cnTw(
            COLORS[isActive ? 'active' : 'inactive'].outer,
            'absolute top-1/2 left-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all',
          )}
        />
        <div
          className={cnTw(
            COLORS[isActive ? 'active' : 'inactive'].inner,
            'relative z-10 h-[8px] w-[8px] rounded-full transition-all',
          )}
        />
      </div>
      <FootnoteText>{t(isActive ? 'fellowship.profile.active' : 'fellowship.profile.inactive')}</FootnoteText>
    </div>
  );
};
