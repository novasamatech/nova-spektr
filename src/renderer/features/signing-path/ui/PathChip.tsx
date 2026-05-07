import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { CaptionText, Icon } from '@/shared/ui';

type Props = { hasError?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Pill-shaped trigger that opens the signing-path overview popover. Used as
 * `<Popover.Trigger>`'s child across PathReviewPopover and SigningPathInline.
 *
 * Radix's `Popover.Trigger` uses `asChild` and forwards mouse / focus / ARIA
 * handlers (including the hover-open `onMouseEnter`/`onMouseLeave`) onto the
 * child via Slot. We must spread the rest of the incoming props onto the
 * `<button>` and forward the ref so those handlers reach the element —
 * otherwise hover-to-open quietly stops working.
 */
export const PathChip = forwardRef<HTMLButtonElement, Props>(({ hasError, ...buttonProps }, ref) => {
  const { t } = useI18n();

  return (
    <button
      ref={ref}
      type="button"
      {...buttonProps}
      className="relative flex w-fit shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-container-border bg-white px-2.5 py-1 transition-colors hover:bg-action-background-hover"
    >
      <Icon name="details" size={12} className="text-icon-accent" />
      <CaptionText className="text-icon-accent uppercase">{t('signingPath.signingPath')}</CaptionText>
      {hasError && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-text-negative"
        />
      )}
    </button>
  );
});

PathChip.displayName = 'PathChip';
