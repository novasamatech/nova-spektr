import { type MouseEvent } from 'react';

import { type ChainAccount, type ShardAccount } from '@shared/core';
import { KeyType } from '@shared/core';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, CaptionText, FootnoteText, HelpText, Icon, IconButton, Identicon } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
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
  showInfoButton?: boolean;
  showSuffix?: boolean;
  className?: string;
  onClick?: () => void;
  onInfoClick?: () => void;
};

export const DerivedAccount = ({
  account,
  addressPrefix = SS58_PUBLIC_KEY_PREFIX,
  showInfoButton = true,
  showSuffix,
  className,
  onClick,
  onInfoClick,
}: Props) => {
  const isShardedAccount = accountUtils.isAccountWithShards(account);
  const chainWithAccountId = !isShardedAccount && account.accountId;
  const chainWithoutAccountId = !isShardedAccount && !account.accountId;

  const handleClick = (fn?: () => void) => {
    return (event: MouseEvent<HTMLButtonElement>) => {
      if (!fn) {
        return;
      }

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
          <div className="flex items-center w-7.5 h-5">
            <Icon size={30} name={KeyIcon[account.keyType]} className="mx-auto text-text-secondary" />
          </div>
        )}

        <div className="flex flex-col overflow-hidden pr-5">
          <BodyText
            className={cnTw(
              'text-text-secondary truncate transition-colors',
              'group-hover:text-text-primary group-focus-within:text-text-primary',
            )}
          >
            {isShardedAccount ? account[0].name : account.name}
          </BodyText>
          {chainWithAccountId && (
            <HelpText className="text-text-tertiary truncate">
              {toAddress(account.accountId, { prefix: addressPrefix })}
            </HelpText>
          )}
        </div>
      </button>

      <div className="absolute right-2 flex items-center">
        {showInfoButton && (
          <IconButton
            className={cnTw(
              'absolute right-0 opacity-0 transition-opacity',
              'group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
              showSuffix && 'hidden',
            )}
            name="info"
            onClick={onInfoClick}
          />
        )}

        <div
          className={cnTw(
            'absolute right-0 pl-2 transition-all opacity-0 bg-white',
            'group-hover:bg-background-suffix-hover group-focus:bg-background-suffix-hover',
            showSuffix && 'opacity-100',
          )}
        >
          <FootnoteText align="right" className="text-text-tertiary ">
            {accountUtils.getDerivationPath(account)}
          </FootnoteText>
        </div>
      </div>
    </div>
  );
};
