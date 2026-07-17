import { type ReactNode } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';

type Props = {
  leadingIcon: ReactNode;
  title: ReactNode;
  chain: Chain | undefined;
  metaLabel: string;
  accountSlot: ReactNode;
  description?: string | null;
  skipButton: ReactNode;
  actionButton: ReactNode;
};

const CardDescription = ({ description }: { description: string }) => {
  const isTrimmed = description.length > 120;
  const displayed = isTrimmed ? `${description.slice(0, 120).trimEnd()}…` : description;
  const text = <FootnoteText className="line-clamp-2 text-text-secondary">{displayed}</FootnoteText>;

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

export const OperationCardShell = ({
  leadingIcon,
  title,
  chain,
  metaLabel,
  accountSlot,
  description,
  skipButton,
  actionButton,
}: Props) => {
  return (
    <div
      className={cnTw(
        'flex h-full flex-col gap-y-3 overflow-hidden rounded-lg',
        'border border-token-container-border bg-block-background-default p-3',
      )}
    >
      <div className="flex items-start justify-between gap-x-3">
        <div className="flex min-w-0 items-center gap-x-2">
          <div className="shrink-0">{leadingIcon}</div>
          <div className="flex min-w-0 flex-col gap-y-0.5">
            <FootnoteText className="truncate font-medium text-text-primary">{title}</FootnoteText>
            <div className="flex min-w-0 items-center gap-x-1.5">
              {chain && <ChainIcon chain={chain} size={14} />}
              <HelpText className="truncate text-text-tertiary">{metaLabel}</HelpText>
            </div>
          </div>
        </div>
        {accountSlot && <div className="max-w-[50%] min-w-0 shrink-0">{accountSlot}</div>}
      </div>

      {description && <div className="flex-1">{<CardDescription description={description} />}</div>}

      <div className="mt-auto grid grid-cols-2 gap-x-2" onClick={(e) => e.stopPropagation()}>
        {skipButton}
        {actionButton}
      </div>
    </div>
  );
};
