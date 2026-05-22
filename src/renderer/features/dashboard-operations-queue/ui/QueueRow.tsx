import { type ReactNode } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';

const RowDescription = ({ description, maxChars }: { description: string; maxChars?: number }) => {
  const isTrimmed = maxChars !== undefined && description.length > maxChars;
  const displayed = isTrimmed ? `${description.slice(0, maxChars).trimEnd()}…` : description;
  const text = <FootnoteText className="line-clamp-2 max-w-[60ch] text-text-secondary">{displayed}</FootnoteText>;

  if (!isTrimmed) {
    return text;
  }

  return (
    <Tooltip side="top">
      <Tooltip.Trigger>
        <div>{text}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="max-w-[400px] break-words whitespace-normal">{description}</div>
      </Tooltip.Content>
    </Tooltip>
  );
};

type Props = {
  leadingIcon: ReactNode;
  title: ReactNode;
  chain: Chain | undefined;
  subtitle?: ReactNode;
  description?: string | null;
  descriptionMaxChars?: number;
  value?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
  onClick: () => void;
};

export const QueueRow = ({
  leadingIcon,
  title,
  chain,
  subtitle,
  description,
  descriptionMaxChars,
  value,
  status,
  action,
  onClick,
}: Props) => {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cnTw(
        'flex w-full cursor-pointer items-center gap-x-3 rounded bg-block-background-default px-3 py-2 text-left',
        'transition-colors hover:bg-action-background-hover hover:shadow-card-shadow',
        'focus-visible:outline-2 focus-visible:outline-icon-accent',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {leadingIcon}

      <div className="flex w-[220px] min-w-0 shrink-0 flex-col gap-y-0.5">
        <FootnoteText className="truncate font-medium text-text-primary">{title}</FootnoteText>
        {(chain || subtitle) && (
          <div className="flex min-w-0 items-center gap-x-1.5">
            {chain && <ChainIcon chain={chain} size={14} />}
            {subtitle && <HelpText className="truncate text-text-tertiary">{subtitle}</HelpText>}
          </div>
        )}
      </div>

      <div className="w-[160px] shrink-0">{value}</div>

      <div className="flex min-w-0 flex-1 items-center">
        {description && <RowDescription description={description} maxChars={descriptionMaxChars} />}
      </div>

      {status && <div className="shrink-0">{status}</div>}

      {action && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
};
