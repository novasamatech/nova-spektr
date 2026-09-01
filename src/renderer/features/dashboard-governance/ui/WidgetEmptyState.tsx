import { type ReactNode, memo } from 'react';

import { BodyText, SmallTitleText } from '@/shared/ui';

type Props = {
  title?: string;
  description: string;
  action?: ReactNode;
};

/**
 * The widget's "nothing here" body. Centred in whatever height the grid gave
 * the card: an empty card is mostly empty space, and a line of text pinned to
 * its top edge reads as a header for content that never arrives.
 */
export const WidgetEmptyState = memo(({ title, description, action }: Props) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-1 px-4 py-6 text-center">
    {title && <SmallTitleText className="text-text-tertiary">{title}</SmallTitleText>}
    <BodyText className="max-w-[420px] text-balance text-text-tertiary">{description}</BodyText>
    {action && <div className="mt-2">{action}</div>}
  </div>
));
