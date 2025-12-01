import { type MouseEvent, type PropsWithChildren } from 'react';

import { type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { useWalletName } from '@/domains/network';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClick?: () => void;
}>;

export const WalletCardSm = ({ wallet, onClick, children }: Props) => {
  const walletName = useWalletName(wallet);

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
      <button className="flex w-full items-center gap-x-2 rounded-sm py-[3px] pr-7 pl-2" onClick={handleClick(onClick)}>
        <WalletIcon type={wallet.type} size={16} />
        <FootnoteText
          className={cnTw(
            'truncate text-text-secondary transition-colors',
            'group-focus-within:text-text-primary group-hover:text-text-primary',
          )}
        >
          {walletName}
        </FootnoteText>
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
