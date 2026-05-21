import { type ReactNode } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';

type Props = {
  leadingIcon: ReactNode;
  title: ReactNode;
  account: ReactNode;
  chain: Chain | undefined;
  status?: ReactNode;
  action?: ReactNode;
  onClick: () => void;
};

export const QueueRow = ({ leadingIcon, title, account, chain, status, action, onClick }: Props) => {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cnTw(
        'flex w-full cursor-pointer items-center gap-x-3 rounded bg-block-background-default px-3 py-2 text-left',
        'transition-shadow hover:shadow-card-shadow focus-visible:outline-2 focus-visible:outline-icon-accent',
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

      <div className="flex shrink-0 flex-col gap-y-0.5">
        <FootnoteText className="font-medium text-text-primary">{title}</FootnoteText>
        {chain && <ChainTitle chain={chain} iconSize={14} fontClass="text-help-text text-text-tertiary" />}
      </div>

      <div className="flex min-w-0 flex-1 items-center">{account}</div>

      {status && <div className="shrink-0">{status}</div>}

      {action && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
};
