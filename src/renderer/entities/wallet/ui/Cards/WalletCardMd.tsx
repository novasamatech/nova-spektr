import { ReactNode, MouseEvent } from 'react';

import type { Wallet } from '@shared/core';
import { FootnoteText, IconButton } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';
import { walletUtils } from '../../lib/wallet-utils';

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
        'group relative flex items-center w-full rounded transition-colors',
        'hover:bg-action-background-hover focus-within:bg-action-background-hover',
        className,
      )}
    >
      <button className="w-full flex gap-x-2 items-center py-1.5 px-2 rounded" onClick={handleClick(onClick)}>
        {prefix}

        {!hideIcon && <WalletIcon type={wallet.type} size={20} />}
        <div className="flex flex-col">
          <div className="flex items-center gap-x-2">
            <FootnoteText className="text-text-primary">{wallet.name}</FootnoteText>
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

      <IconButton
        className={cnTw(
          'absolute right-2 opacity-0 transition-opacity',
          'group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
        )}
        name="info"
        onClick={handleClick(onInfoClick)}
      />
    </div>
  );
};
