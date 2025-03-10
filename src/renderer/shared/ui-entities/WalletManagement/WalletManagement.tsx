import { type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon, Identicon } from '@/shared/ui';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  meta?: ReactNode;
  accountId: string | undefined;
  isMultishard?: boolean;
  onClick: () => void;
};

export const WalletManagement = ({
  wallet,
  accountId,
  isMultishard = false,
  description,
  meta,
  children,
  onClick,
}: PropsWithChildren<Props>) => {
  return (
    <div
      className={cnTw(
        'group relative flex w-full items-center rounded transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <button className="flex w-full items-center gap-x-2 rounded py-1.5 pl-2 pr-8" onClick={onClick}>
        {wallet.isActive ? (
          <Icon name="checkmark" className="shrink-0 text-icon-accent" size={20} />
        ) : (
          <div className="row-span-2 h-5 w-5 shrink-0" />
        )}

        <Identicon address={accountId} size={16} background={false} theme={isMultishard ? 'jdenticon' : 'polkadot'} />

        <div className="flex min-w-0 flex-grow flex-col">
          <div className="flex items-center gap-x-2">
            <BodyText
              className={cnTw(
                'truncate text-text-secondary transition-colors',
                'group-focus-within:text-text-primary group-hover:text-text-primary',
                { 'text-text-primary': wallet.isActive },
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
          'absolute right-2 top-1/2 flex -translate-y-1/2 opacity-0 transition-opacity',
          'focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100',
        )}
      >
        {children}
      </div>
    </div>
  );
};
