import { cnTw } from '@/shared/lib/utils';
import { CountChip, FootnoteText, Icon } from '@/shared/ui';

type Props = {
  /** Already translated group name. */
  label: string;
  /** Row count chip; omitted (not `0`) when the count is unknown. */
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
};

/**
 * Collapsible heading of one group in the operations list (In progress,
 * Completed, Rejected, Hidden, Drafts): a chevron, the group name and its
 * count. Toggles the group via `onToggle`; the collapse state itself lives in
 * the operations context model.
 */
export const SectionHeading = ({ label, count, collapsed, onToggle }: Props) => {
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
      <FootnoteText className="font-semibold text-text-primary">{label}</FootnoteText>
      {count !== undefined && <CountChip count={count} />}
    </button>
  );
};
