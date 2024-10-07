import { memo } from 'react';

import { type Address as AddressType, type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Identicon } from '@/shared/ui';
import { Hash } from '../Hash/Hash';

type AddressVariant = 'full' | 'truncate';

type IconProps = XOR<{
  showIcon: boolean;
  iconSize?: number;
  canCopy?: boolean;
}>;

type Props = IconProps & {
  address: AddressType;
  title?: string;
  variant?: AddressVariant;
  testId?: string;
};

export const Address = memo<Props>(
  ({ title, variant = 'full', canCopy = true, showIcon, iconSize = 16, address, testId = 'Address' }) => {
    const titleNode = title ? <span className="truncate text-text-primary">{title}</span> : null;
    const addressNode = (
      <span
        className={cnTw('w-full text-left', {
          'text-help-text text-text-tertiary': title,
        })}
      >
        <Hash value={address} variant={variant} />
      </span>
    );

    return (
      <span className="flex w-full items-center gap-2 overflow-hidden" data-testid={testId}>
        {showIcon && <Identicon address={address} size={iconSize} background={false} canCopy={canCopy} />}
        <span className="flex w-full flex-col">
          {titleNode}
          {addressNode}
        </span>
      </span>
    );
  },
);
