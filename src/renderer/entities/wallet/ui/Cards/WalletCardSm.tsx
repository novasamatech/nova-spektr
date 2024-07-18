import { type MouseEvent } from 'react';

import { type Wallet } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { FootnoteText, IconButton } from '@shared/ui';
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
        'group relative flex items-center w-full rounded transition-colors',
        'hover:bg-action-background-hover focus-within:bg-action-background-hover',
        className,
      )}
    >
      <button className="w-full flex gap-x-2 items-center pl-2 py-[3px] pr-7 rounded" onClick={handleClick(onClick)}>
        <WalletIcon className="shrink-0" type={wallet.type} size={iconSize} />
        <FootnoteText
          className={cnTw(
            'text-text-secondary transition-colors truncate',
            'group-hover:text-text-primary group-focus-within:text-text-primary',
          )}
        >
          {wallet.name}
        </FootnoteText>
      </button>
      <IconButton className={cnTw('absolute right-2')} name="info" size={16} onClick={handleClick(onInfoClick)} />
    </div>
  );
};
