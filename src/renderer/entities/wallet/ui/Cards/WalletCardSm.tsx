import { type MouseEvent } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, IconButton } from '@/shared/ui';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  wallet: Wallet;
  iconSize?: number;
  className?: string;
  onClick?: () => void;
  onInfoClick?: () => void;
};

export const WalletCardSm = ({ wallet, className, iconSize = 16, onClick, onInfoClick }: Props) => {
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
      <button className="flex w-full items-center gap-x-2 rounded py-[3px] pl-2 pr-7" onClick={handleClick(onClick)}>
        <WalletIcon className="shrink-0" type={wallet.type} size={iconSize} />
        <FootnoteText
          className={cnTw(
            'truncate text-text-secondary transition-colors',
            'group-focus-within:text-text-primary group-hover:text-text-primary',
          )}
        >
          {wallet.name}
        </FootnoteText>
      </button>
      {/* TODO: do the same as in WalletCardMd */}
      <IconButton className="absolute right-2" name="details" size={16} onClick={handleClick(onInfoClick)} />
    </div>
  );
};
