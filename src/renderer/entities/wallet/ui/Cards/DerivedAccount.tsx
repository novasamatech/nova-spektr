import { type MouseEvent, type PropsWithChildren } from 'react';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@/shared/lib/utils';
import { BodyText, CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { accountUtils } from '../../lib/account-utils';
import { KeyIcon } from '../../lib/constants';

type Props = PropsWithChildren<{
  account: VaultChainAccount | VaultShardAccount[];
  addressPrefix?: number;
  showSuffix?: boolean;
  className?: string;
  onClick?: () => void;
}>;

export const DerivedAccount = ({
  account,
  addressPrefix = SS58_PUBLIC_KEY_PREFIX,
  showSuffix,
  className,
  children,
  onClick,
}: Props) => {
  const isShardedAccount = accountUtils.isAccountWithShards(account);
  const chainWithAccountId = !isShardedAccount && account.accountId;
  const chainWithoutAccountId = !isShardedAccount && !account.accountId;

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
        {isShardedAccount && (
          <div className="flex h-5 w-7.5 items-center justify-center rounded-2lg bg-input-background-disabled">
            <CaptionText className="text-text-secondary">{account.length}</CaptionText>
          </div>
        )}

        {chainWithAccountId && (
          <div className="flex">
            <Identicon
              background={false}
              canCopy={false}
              address={toAddress(account.accountId, { prefix: addressPrefix })}
              size={20}
            />
            <Icon
              className="z-10 -ml-2.5 rounded-full border bg-white text-text-secondary"
              size={20}
              name={KeyIcon[account.keyType]}
            />
          </div>
        )}

        {chainWithoutAccountId && (
          <div className="flex h-5 w-7.5 items-center">
            <Icon size={30} name={KeyIcon[account.keyType]} className="mx-auto text-text-secondary" />
          </div>
        )}

        <div className="flex flex-col overflow-hidden pr-5">
          <BodyText
            className={cnTw(
              'truncate text-text-secondary transition-colors',
              'group-focus-within:text-text-primary group-hover:text-text-primary',
            )}
          >
            {isShardedAccount ? account[0].name : account.name}
          </BodyText>
          {chainWithAccountId && (
            <HelpText className="truncate text-text-tertiary">
              {toAddress(account.accountId, { prefix: addressPrefix })}
            </HelpText>
          )}
        </div>
      </Tag>

      <div className="absolute right-2 flex items-center">
        {children && (
          <div
            className={cnTw(
              'absolute right-0 z-10 opacity-0 transition-opacity',
              'group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100',
              showSuffix && 'hidden',
            )}
          >
            {children}
          </div>
        )}

        <div
          className={cnTw(
            'absolute right-0 bg-white pl-2 opacity-0 transition-all',
            'group-hover:bg-background-suffix-hover group-focus:bg-background-suffix-hover',
            showSuffix && 'opacity-100',
          )}
        >
          <FootnoteText align="right" className="text-text-tertiary">
            {accountUtils.getDerivationPath(account)}
          </FootnoteText>
        </div>
      </div>
    </div>
  );
};
