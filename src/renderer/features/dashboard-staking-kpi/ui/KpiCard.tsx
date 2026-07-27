import { type KeyboardEvent, type ReactNode, memo, useCallback } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  title: string;
  /** Big headline figure. Replaced by a shimmer while `loading`. */
  value: ReactNode;
  valueClass?: string;
  subline: ReactNode;
  /**
   * Optional call-to-action strip. Dropped entirely when there is nothing to
   * act on — the card never shows a "nothing to claim" placeholder.
   */
  footer?: ReactNode;
  loading?: boolean;
  onClick: () => void;
  ariaLabel: string;
};

/**
 * The shell of one KPI card. Its height is fixed and the footer is pinned to
 * the bottom, so neither a shimmer resolving into a value nor a footer
 * appearing shifts the row.
 */
export const KpiCard = memo(({ title, value, valueClass, subline, footer, loading, onClick, ariaLabel }: Props) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cnTw(
        'flex h-40 cursor-pointer flex-col rounded-lg border border-token-container-border bg-white p-4',
        'shadow-card-shadow transition-shadow hover:shadow-card-shadow-level2',
        'focus-visible:ring-2 focus-visible:ring-primary-button-background-default focus-visible:outline-none',
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <FootnoteText className="truncate text-text-tertiary">{title}</FootnoteText>

      <div className="mt-1 flex h-8 items-center">
        {loading ? <Skeleton width={112} height={24} /> : <TitleText className={valueClass}>{value}</TitleText>}
      </div>

      <div className="mt-0.5 flex h-4 items-center">
        {loading ? (
          <Skeleton width={144} height={12} />
        ) : (
          <HelpText className="truncate text-text-tertiary">{subline}</HelpText>
        )}
      </div>

      {footer ? <div className="mt-auto border-t border-divider pt-2">{footer}</div> : null}
    </div>
  );
});
