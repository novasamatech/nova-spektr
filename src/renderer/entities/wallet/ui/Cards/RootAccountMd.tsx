import { type MouseEvent } from 'react';

import { type AccountId } from '@shared/core';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, IconButton, Identicon } from '@shared/ui';

type Props = {
  name: string;
  accountId: AccountId;
  className?: string;
  onClick?: () => void;
  onInfoClick?: () => void;
};

export const RootAccountMd = ({ name, accountId, className, onClick, onInfoClick }: Props) => {
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
      <button
        className="flex items-center gap-x-2 w-full py-1.5 px-2 rounded overflow-hidden"
        onClick={handleClick(onClick)}
      >
        <Identicon
          theme="jdenticon"
          background={false}
          canCopy={false}
          address={toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX })}
          size={20}
        />
        <BodyText className="text-text-secondary truncate pr-5">{name}</BodyText>
      </button>

      <IconButton name="info" className="absolute right-2 mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
