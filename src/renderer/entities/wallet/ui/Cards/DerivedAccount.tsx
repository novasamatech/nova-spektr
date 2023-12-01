import { MouseEvent } from 'react';

import { BodyText, Identicon, IconButton, CaptionText, Icon, HelpText } from '@shared/ui';
import { cnTw, toAddress, SS58_PUBLIC_KEY_PREFIX } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';
import { KeyType, ShardAccount, ChainAccount } from '@shared/core';
import { accountUtils } from '../../lib/account-utils';

const KeyIcon: Record<KeyType, IconNames> = {
  [KeyType.CUSTOM]: 'keyCustom',
  [KeyType.GOVERNANCE]: 'keyGovernance',
  [KeyType.HOT]: 'keyHot',
  [KeyType.MAIN]: 'keyMain',
  [KeyType.PUBLIC]: 'keyPublic',
  [KeyType.STAKING]: 'keyStaking',
};

type Props = {
  account: ChainAccount | ShardAccount[];
  addressPrefix?: number;
  className?: string;
  onClick?: () => void;
  onInfoClick?: () => void;
};

export const DerivedAccount = ({
  account,
  addressPrefix = SS58_PUBLIC_KEY_PREFIX,
  className,
  onClick,
  onInfoClick,
}: Props) => {
  const isShardedAccount = accountUtils.isAccountWithShards(account);
  const chainWithAccountId = !isShardedAccount && account.accountId;
  const chainWithoutAccountId = !isShardedAccount && !account.accountId;

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
      <button className="flex items-center gap-x-2 w-full py-1.5 px-2 rounded" onClick={handleClick(onClick)}>
        {isShardedAccount && (
          <div className="flex items-center justify-center w-7.5 h-5 rounded-2lg bg-input-background-disabled">
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
              className="z-10 -ml-2.5 text-text-secondary rounded-full border bg-white"
              size={20}
              name={KeyIcon[account.keyType]}
            />
          </div>
        )}

        {chainWithoutAccountId && (
          <div className="w-7.5">
            <Icon size={20} name={KeyIcon[account.keyType]} className="mx-auto text-text-secondary" />
          </div>
        )}

        <div className="flex flex-col">
          <BodyText
            className={cnTw(
              'flex-1 text-text-secondary transition-colors',
              'group-hover:text-text-primary group-focus-within:text-text-primary',
            )}
          >
            {isShardedAccount ? account[0].name : account.name}
          </BodyText>
          {chainWithAccountId && (
            <HelpText className="text-text-tertiary">
              {toAddress(account.accountId, { prefix: addressPrefix })}
            </HelpText>
          )}
        </div>
      </button>

      <IconButton
        className={cnTw(
          'absolute right-2 opacity-0 transition-opacity',
          'group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
        )}
        name="info"
        onClick={onInfoClick}
      />
      {/*<FootnoteText*/}
      {/*  align="right"*/}
      {/*  className={cnTw('flex-1 text-text-tertiary transition-opacity opacity-0', showDerivationPath && 'opacity-100')}*/}
      {/*>*/}
      {/*  {accountUtils.getDerivationPath(account)}*/}
      {/*</FootnoteText>*/}
    </div>
  );
};
