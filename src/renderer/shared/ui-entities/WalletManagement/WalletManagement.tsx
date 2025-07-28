import { type PropsWithChildren, type ReactNode } from 'react';

import { type Address, type Chain, type Wallet } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon, type IconTheme, Identicon } from '@/shared/ui';
import { Label } from '@/shared/ui-kit';
import { ChainIcon } from '../ChainIcon/ChainIcon';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  meta?: ReactNode;
  address: Address | undefined;
  theme: IconTheme;
  onClick: () => void;
  chain?: Chain | null;
  label?: string | null;
};

export const WalletManagement = ({
  wallet,
  address,
  theme,
  description,
  meta,
  children,
  onClick,
  chain: flexibleMultisigChain,
  label,
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
          <Icon name="checkmarkCutout" className="shrink-0 text-icon-accent" size={16} />
        ) : (
          <div className="row-span-2 h-4 w-4 shrink-0" />
        )}

        <Identicon canCopy={false} address={address} size={16} background={false} theme={theme} />

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
            {flexibleMultisigChain && (
              <div className="flex items-center gap-x-1">
                <Label variant="purple">{label}</Label>
                <ChainIcon chain={flexibleMultisigChain} />
              </div>
            )}

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
