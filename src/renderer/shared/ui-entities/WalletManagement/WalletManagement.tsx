import { type PropsWithChildren, type ReactNode, memo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { cnTw, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, FootnoteText, Icon } from '@/shared/ui';
import { Label } from '@/shared/ui-kit';
import { ChainIcon } from '../ChainIcon/ChainIcon';
import { Identicon, type IdenticonIconTheme } from '../Identicon/Identicon';

type Props = {
  wallet: Wallet;
  active: boolean;
  accountId: AccountId | null;
  description?: string | ReactNode;
  checkBox?: ReactNode;
  meta?: ReactNode;
  theme?: IdenticonIconTheme;
  onClick: () => void;
  chain?: Chain | null;
  label?: string | null;
};

export const WalletManagement = memo(
  ({
    wallet,
    active,
    accountId,
    theme,
    description,
    meta,
    children,
    onClick,
    chain,
    label,
    checkBox,
  }: PropsWithChildren<Props>) => {
    return (
      <div
        className={cnTw(
          'group relative flex w-full items-center rounded transition-colors',
          'focus-within:bg-action-background-hover hover:bg-action-background-hover',
        )}
      >
        <button
          className="flex w-full min-w-0 shrink cursor-pointer items-center gap-x-2 rounded px-2 py-1.5"
          onClick={onClick}
        >
          {active ? (
            <Icon name="checkmarkCutout" className="shrink-0 text-icon-accent" size={16} />
          ) : (
            <div className="row-span-2 h-4 w-4 shrink-0" />
          )}

          {checkBox}
          {accountId && (
            <Identicon
              address={toAddress(accountId, { prefix: chain?.addressPrefix })}
              size={16}
              background={false}
              theme={theme}
            />
          )}

          <div className="flex min-w-0 flex-grow flex-col">
            <div className="flex items-center gap-x-2">
              <BodyText
                className={cnTw(
                  'truncate text-text-secondary transition-colors',
                  'group-focus-within:text-text-primary group-hover:text-text-primary',
                  { 'text-text-primary': active },
                )}
              >
                {wallet.name}
              </BodyText>
              {
                <div className="flex shrink-0 items-center gap-x-1">
                  {nonNullable(label) && <Label variant="purple">{label}</Label>}
                  {nonNullable(chain) && <ChainIcon chain={chain} size={16} />}
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

        <div className="shrink-0 pe-2">{children}</div>
      </div>
    );
  },
);
