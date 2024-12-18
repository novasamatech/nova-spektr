import { type PropsWithChildren } from 'react';

import { type AccountId, type Address, type KeyType } from '@/shared/core';
import { cnTw, nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, HelpText, Icon, Identicon } from '@/shared/ui';
import { Hash } from '@/shared/ui-entities';
import { KeyIcon } from '../../lib/constants';

type Props = PropsWithChildren<{
  name?: string;
  address: Address | AccountId;
  addressPrefix?: number;
  keyType?: KeyType;
  iconSize?: number;
  className?: string;
  hideAddress?: boolean;
}>;

export const ContactItem = ({
  name,
  address,
  addressPrefix,
  iconSize = 20,
  hideAddress = false,
  keyType,
  children,
}: Props) => {
  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  return (
    <div
      className={cnTw(
        'group relative flex w-full items-center rounded transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <div className={cnTw('flex w-full items-center gap-x-2 overflow-hidden py-1.5 pl-2', children ? 'pr-9' : 'pr-3')}>
        <div className="flex">
          <Identicon address={formattedAddress} size={iconSize} background={false} />

          {keyType && (
            <Icon
              className="z-10 -ml-2.5 rounded-full border bg-white text-text-secondary"
              size={iconSize}
              name={KeyIcon[keyType]}
            />
          )}
        </div>

        <div className="flex flex-col overflow-hidden">
          {name ? (
            <BodyText
              className={cnTw(
                'truncate text-text-secondary transition-colors',
                'group-focus-within:text-text-primary group-hover:text-text-primary',
              )}
            >
              {name}
            </BodyText>
          ) : (
            <BodyText
              className={cnTw(
                'text-text-secondary transition-colors',
                'group-focus-within:text-text-primary group-hover:text-text-primary',
              )}
            >
              <Hash value={formattedAddress} variant="truncate" />
            </BodyText>
          )}

          {nonNullable(name) && !hideAddress && (
            <HelpText className="truncate text-text-tertiary">{formattedAddress}</HelpText>
          )}
        </div>
      </div>

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
