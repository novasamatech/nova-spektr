import { type MouseEvent, type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, IconButton } from '@/shared/ui';
import { walletUtils } from '../../lib/wallet-utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  prefix?: ReactNode;
  hideIcon?: boolean;
  className?: string;
  onClick?: () => void;
  onInfoClick?: () => void;
};

export const WalletCardMd = ({ wallet, description, prefix, hideIcon, className, onClick, onInfoClick }: Props) => {
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
        className,
      )}
    >
      <button className="flex w-full items-center gap-x-2 rounded px-2 py-1.5" onClick={handleClick(onClick)}>
        {prefix}

        {!hideIcon && <WalletIcon type={wallet.type} size={20} />}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-x-2">
            <FootnoteText className="truncate text-text-primary">{wallet.name}</FootnoteText>
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

      {onInfoClick && (
        <IconButton
          className={cnTw(
            'absolute right-2 opacity-0 transition-opacity',
            'focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100',
          )}
          name="details"
          onClick={handleClick(onInfoClick)}
        />
      )}
    </div>
  );
};
