import { type PropsWithChildren, type ReactNode } from 'react';

import { type Address, type Chain, type Wallet } from '@/shared/core';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon } from '@/shared/ui';
import { Label } from '@/shared/ui-kit';
import { ChainIcon } from '../ChainIcon/ChainIcon';
import { Identicon, type IdenticonIconTheme } from '../Identicon/Identicon';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  meta?: ReactNode;
  address: Address | undefined;
  theme?: IdenticonIconTheme;
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
  chain,
  label,
}: PropsWithChildren<Props>) => {
  return (
    <div
      className={cnTw(
        'group relative flex w-full items-center rounded-sm transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <button className="flex w-full items-center gap-x-2 rounded-sm py-1.5 pr-8 pl-2" onClick={onClick}>
        {wallet.isActive ? (
          <Icon name="checkmarkCutout" className="text-icon-accent shrink-0" size={16} />
        ) : (
          <div className="row-span-2 h-4 w-4 shrink-0" />
        )}

        <Identicon canCopy={false} address={address ?? ''} size={16} background={false} theme={theme} />

        <div className="flex min-w-0 grow flex-col">
          <div className="flex items-center gap-x-2">
            <BodyText
              className={cnTw(
                'text-text-secondary truncate transition-colors',
                'group-focus-within:text-text-primary group-hover:text-text-primary',
                { 'text-text-primary': wallet.isActive },
              )}
            >
              {wallet.name}
            </BodyText>
            {
              <div className="flex items-center gap-x-1">
                {nonNullable(label) && <Label variant="purple">{label}</Label>}
                {nonNullable(chain) && <ChainIcon chain={chain} />}
              </div>
            }

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
