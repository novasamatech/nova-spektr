import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CountChip, FootnoteText, Icon } from '@/shared/ui';

type Props = {
  labelKey: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
};

export const SectionHeading = ({ labelKey, count, collapsed, onToggle }: Props) => {
  const { t } = useI18n();

  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      className={cnTw(
        'flex items-center gap-2 rounded-sm px-2 pt-4 pb-1.5',
        'focus-visible:outline-2 focus-visible:outline-icon-accent',
      )}
      onClick={onToggle}
    >
      <Icon
        name="shelfDown"
        size={15}
        className={cnTw('text-icon-default transition-transform', collapsed ? 'rotate-0' : 'rotate-180')}
      />
      <FootnoteText className="font-semibold text-text-primary">{t(labelKey)}</FootnoteText>
      {count !== undefined && <CountChip count={count} />}
    </button>
  );
};
