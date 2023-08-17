import { cnTw, toAddress, toShortAddress } from '@renderer/shared/lib/utils';
import { Identicon, Truncate } from '@renderer/shared/ui';
import { IconSize } from '@renderer/shared/ui/types';
import { AccountId, Address, SigningType } from '@renderer/domain/shared-kernel';

type AddressType = 'full' | 'short' | 'adaptive';

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

export type Props = IconSize & {
  className?: string;
  type?: AddressType;
  addressFont?: string;
  signType?: SigningType;
  name?: string;
  symbols?: number;
  canCopy?: boolean;
  showIcon?: boolean;
} & (WithAccountId | WithAddress);

export const getAddress = (props: WithAccountId | WithAddress): Address => {
  if ((props as WithAddress).address) return (props as WithAddress).address;

  const { accountId, addressPrefix } = props as WithAccountId;

  return toAddress(accountId, { prefix: addressPrefix });
};

export const AccountAddress = ({
  className,
  symbols,
  signType,
  name,
  size = 16,
  addressFont,
  type = 'full',
  canCopy = true,
  showIcon = true,
  ...props
}: Props) => {
  const currentAddress = getAddress(props);
  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? toShortAddress(currentAddress, symbols) : currentAddress;

  const nameContent = name && <p className={cnTw('text-footnote text-text-primary truncate', addressFont)}>{name}</p>;

  const addressContent = typeIsAdaptive ? (
    <Truncate
      className={cnTw('text-footnote text-text-secondary', addressFont)}
      ellipsis="..."
      start={4}
      end={4}
      text={addressToShow}
    />
  ) : (
    <p className={cnTw('inline-block break-all text-footnote text-text-secondary truncate', addressFont)}>
      {addressToShow}
    </p>
  );

  return (
    <div className={cnTw('flex items-center gap-x-2', className)}>
      {showIcon && (
        <Identicon className="inline-block" address={currentAddress} size={size} background={false} canCopy={canCopy} />
      )}
      {nameContent || addressContent}
    </div>
  );
};
