import { memo } from 'react';

import { type Address as AddressType, type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Identicon } from '@/shared/ui/Identicon/Identicon';
import { Hash } from '../Hash/Hash';

type IconProps = XOR<{
  showIcon: boolean;
  iconSize?: number;
  canCopy?: boolean;
}>;

type Props = IconProps & {
  address: AddressType;
  title?: string;
  hideAddress?: boolean;
  variant?: 'full' | 'truncate' | 'short';
  testId?: string;
};

export const Address = memo(
  ({
    title,
    variant = 'full',
    canCopy = true,
    showIcon,
    iconSize = 16,
    address,
    testId = 'Address',
    hideAddress,
  }: Props) => {
    const titleNode = title ? <span className="truncate">{title}</span> : null;

    const addressNode = (
      <span
        className={cnTw('w-full', {
          'text-help-text text-text-tertiary': title && !hideAddress,
          hidden: title && hideAddress,
        })}
      >
        <Hash value={address} variant={variant} />
      </span>
    );

    return (
      <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden" data-testid={testId}>
        {showIcon && <Identicon address={address} size={iconSize} background={false} canCopy={canCopy} />}
        <span className="flex w-full flex-col overflow-hidden">
          {titleNode}
          {addressNode}
        </span>
      </span>
    );
  },
);
