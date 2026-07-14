import { type MouseEvent, type PropsWithChildren } from 'react';

import { type Chain, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { cnTw, nullable } from '@/shared/lib/utils';
import { BodyText, CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { accountUtils } from '../../lib/account-utils';
import { KeyIcon } from '../../lib/constants';

type Props = PropsWithChildren<{
  account: VaultChainAccount | VaultShardAccount[];
  chain?: Chain;
  showSuffix?: boolean;
  className?: string;
  onClick?: () => void;
}>;

/** Children are rendered as an extra section inside the explorers popover. */
export const DerivedAccount = ({ account, chain, showSuffix, className, children, onClick }: Props) => {
  const isShardedAccount = accountUtils.isAccountWithShards(account);
  const derivationPath = accountUtils.getDerivationPath(account);
  const accountId = isShardedAccount ? null : account.accountId;

  const handleClick = (fn?: () => void) => {
    return (event: MouseEvent<HTMLElement>) => {
      if (!fn) return;

      event.stopPropagation();
      fn();
    };
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <div
      className={cnTw(
        'group relative flex w-full items-center rounded-sm transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
        className,
      )}
    >
      <Tag className="flex w-full items-center gap-x-2 rounded-sm px-2 py-1.5" onClick={handleClick(onClick)}>
        {chain && <ChainTitle className="shrink-0" showChainName={false} chain={chain} />}

        <div className="flex min-w-0 items-center gap-x-2">
          {isShardedAccount && (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-2lg bg-input-background-disabled">
              <CaptionText className="text-text-secondary">{account.length}</CaptionText>
            </div>
          )}

          {nullable(accountId) ? (
            <>
              {!isShardedAccount && (
                <div className="flex h-5 w-5 shrink-0 items-center">
                  <Icon size={20} name={KeyIcon[account.keyType]} className="mx-auto text-text-secondary" />
                </div>
              )}
              <BodyText
                className={cnTw(
                  'truncate text-text-secondary transition-colors',
                  'group-focus-within:text-text-secondary group-hover:text-text-secondary',
                )}
              >
                {derivationPath}
              </BodyText>
            </>
          ) : (
            <Account
              accountId={accountId}
              chain={chain ?? null}
              title={derivationPath}
              titleClass="text-body text-text-secondary"
              iconSize={20}
              hideExplorers={nullable(chain)}
            >
              {children}
            </Account>
          )}
        </div>
      </Tag>

      <div
        className={cnTw(
          'absolute right-2 bg-white pl-2 opacity-0 transition-all',
          'group-hover:bg-background-suffix-hover group-focus:bg-background-suffix-hover',
          // Invisible by default — must not swallow clicks aimed at the explorers button.
          showSuffix ? 'opacity-100' : 'pointer-events-none',
        )}
      >
        <FootnoteText align="right" className="text-text-tertiary">
          {derivationPath}
        </FootnoteText>
      </div>
    </div>
  );
};
