import { type MouseEvent, type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';

type Props = PropsWithChildren<{
  wallet: Wallet;
  description?: string | ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
}>;

export const WalletCardMd = ({ wallet, description, meta, children, onClick }: Props) => {
  const handleClick = (fn?: () => void) => {
    return (event: MouseEvent<HTMLButtonElement>) => {
      if (!fn) return;

      event.stopPropagation();
      fn();
    };
  };

  return (
    <div
      className={cnTw(
        'group relative flex w-full items-center rounded-sm transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <button
        className={cnTw('flex w-full items-center gap-x-2 rounded-sm px-2 py-1.5', {
          'pointer-events-none': nullable(onClick),
          'pr-6': nonNullable(children),
        })}
        onClick={handleClick(onClick)}
      >
        <WalletIcon type={wallet.type} size={20} />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-x-2">
            <BodyText
              className={cnTw(
                'truncate text-text-secondary transition-colors',
                'group-focus-within:text-text-primary group-hover:text-text-primary',
              )}
            >
              {wallet.name}
            </BodyText>
            {meta}
          </div>
          {typeof description === 'string' ? (
            <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
          ) : (
            description
          )}
        </div>
      </button>

      <div
        className={cnTw(
          'absolute top-1/2 right-2 flex -translate-y-1/2 opacity-0 transition-opacity',
          'group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100',
        )}
      >
        {children}
      </div>
    </div>
  );
};
