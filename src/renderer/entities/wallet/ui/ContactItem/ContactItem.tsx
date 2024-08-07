import { type MouseEvent } from 'react';

import { type AccountId, type Address } from '@shared/core';
import { cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, HelpText, IconButton, Identicon } from '@shared/ui';

type Props = {
  name?: string;
  address: Address | AccountId;
  addressPrefix?: number;
  size?: number;
  className?: string;
  hideAddress?: boolean;
  onInfoClick?: () => void;
};
export const ContactItem = ({
  name,
  address,
  addressPrefix,
  size = 20,
  hideAddress = false,
  className,
  onInfoClick,
}: Props) => {
  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cnTw('group flex items-center gap-x-2 w-full', className)}>
      <div className="flex items-center gap-x-2 w-full py-[3px] overflow-hidden" onClick={handleClick}>
        <Identicon address={formattedAddress} size={size} background={false} />

        <div className="flex flex-col">
          {name && (
            <BodyText
              className={cnTw(
                'text-text-secondary truncate transition-colors',
                'group-hover:text-text-primary group-focus:text-text-primary',
              )}
            >
              {name}
            </BodyText>
          )}
          {!hideAddress && <HelpText className="text-text-tertiary truncate">{formattedAddress}</HelpText>}
        </div>
      </div>

      <IconButton name="details" className="mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
