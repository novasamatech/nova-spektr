import { type MouseEvent, type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { walletUtils } from '../../lib/wallet-utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  prefix?: ReactNode;
  hideIcon?: boolean;
  onClick?: () => void;
};

export const WalletCardMd = ({
  wallet,
  description,
  prefix,
  hideIcon,
  children,
  onClick,
}: PropsWithChildren<Props>) => {
  const isWalletConnect = walletUtils.isWalletConnectGroup(wallet);

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
        'group relative flex w-full items-center rounded transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <button
        className={cnTw('flex w-full items-center gap-x-2 rounded px-2 py-1.5', {
          'pointer-events-none': nullable(onClick),
          'pr-6': nonNullable(children),
        })}
        onClick={handleClick(onClick)}
      >
        {prefix}

        {!hideIcon && <WalletIcon type={wallet.type} size={20} className="shrink-0" />}
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
            {isWalletConnect && (
              <span
                className={cnTw(
                  'h-1.5 w-1.5 rounded-full',
                  wallet.isConnected ? 'bg-icon-positive' : 'bg-icon-default',
                )}
              />
            )}
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
