import { hexToU8a } from '@polkadot/util';

import { type Address } from '@/shared/core';
import { cnTw, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Identicon, Truncate } from '@/shared/ui';

type AddressType = 'full' | 'short' | 'adaptive';

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

export type AccountAddressProps = {
  className?: string;
  type?: AddressType;
  addressFont?: string;
  nameFont?: string;
  name?: string;
  size?: number;
  symbols?: number;
  canCopy?: boolean;
  showIcon?: boolean;
} & (WithAccountId | WithAddress);

export const getAddress = (props: WithAccountId | WithAddress): Address => {
  if ('address' in props) {
    return props.address;
  }

  const { accountId, addressPrefix } = props as WithAccountId;

  if (hexToU8a(accountId).length === 20) {
    return accountId;
  }

  return toAddress(accountId, { prefix: addressPrefix });
};

/**
 * @deprecated Use `import { Address } from '@/shared/ui-entities'` instead.
 */
export const AccountAddress = ({
  className,
  symbols = 8,
  name,
  size = 16,
  addressFont,
  type = 'full',
  canCopy = true,
  showIcon = true,
  ...props
}: AccountAddressProps) => {
  const currentAddress = getAddress(props);

  if (!currentAddress) {
    return null;
  }

  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? toShortAddress(currentAddress, symbols) : currentAddress;

  const nameContent = name && <p className={cnTw('truncate text-footnote text-text-primary', addressFont)}>{name}</p>;

  const addressContent = typeIsAdaptive ? (
    <Truncate
      className={cnTw('text-footnote text-inherit transition-colors', addressFont)}
      ellipsis="..."
      start={4}
      end={4}
      text={addressToShow}
    />
  ) : (
    <span className={cnTw('inline-block truncate break-all text-footnote text-inherit transition-colors', addressFont)}>
      {addressToShow}
    </span>
  );

  return (
    <span className={cnTw('flex items-center gap-x-2', className)}>
      {showIcon && (
        <Identicon className="inline-block" address={currentAddress} size={size} background={false} canCopy={canCopy} />
      )}
      {nameContent || addressContent}
    </span>
  );
};
