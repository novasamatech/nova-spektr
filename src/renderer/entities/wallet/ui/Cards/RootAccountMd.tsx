import { type MouseEvent } from 'react';

import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, IconButton, Identicon } from '@/shared/ui';

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
        'group relative flex w-full items-center rounded transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
        className,
      )}
    >
      <button
        className="flex w-full items-center gap-x-2 overflow-hidden rounded px-2 py-1.5"
        onClick={handleClick(onClick)}
      >
        <Identicon
          theme="jdenticon"
          background={false}
          canCopy={false}
          address={toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX })}
          size={20}
        />
        <BodyText className="truncate pr-5 text-text-secondary">{name}</BodyText>
      </button>

      <IconButton name="details" className="absolute right-2 mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
