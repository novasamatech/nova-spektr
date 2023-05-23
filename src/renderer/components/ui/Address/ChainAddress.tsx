import cnTw from '@renderer/shared/utils/twMerge';
import { Identicon } from '@renderer/components/ui';
import { SigningType, AccountId, Address } from '@renderer/domain/shared-kernel';
import { toShortAddress, toAddress } from '@renderer/shared/utils/address';
import Truncate from '../Truncate/Truncate';

type AddressType = 'full' | 'short' | 'adaptive';
type AddressStyle = 'small' | 'normal' | 'large';

const Styles: Record<AddressStyle, string> = {
  small: 'text-2xs text-neutral-variant font-normal',
  normal: 'text-xs leading-4 text-neutral-variant font-normal',
  large: 'text-base text-neutral',
};

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

type Props = {
  className?: string;
  type?: AddressType;
  addressStyle?: AddressStyle;
  signType?: SigningType;
  name?: string;
  subName?: string;
  size?: number;
  symbols?: number;
  canCopy?: boolean;
  showIcon?: boolean;
} & (WithAccountId | WithAddress);

const getAddress = (props: WithAccountId | WithAddress): Address => {
  if ((props as WithAddress).address) return (props as WithAddress).address;

  const { accountId, addressPrefix } = props as WithAccountId;

  return toAddress(accountId, { prefix: addressPrefix });
};

const ChainAddress = ({
  className,
  symbols,
  signType,
  name,
  subName,
  size = 16,
  addressStyle = 'normal',
  type = 'full',
  canCopy = true,
  showIcon = true,
  ...props
}: Props) => {
  const currentAddress = getAddress(props);
  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? toShortAddress(currentAddress, symbols) : currentAddress;

  const nameContent = (name || subName) && (
    <div className="flex flex-col items-start">
      <p className="text-neutral text-sm font-semibold leading-4">{name}</p>
      {subName && <p className="text-neutral-variant text-2xs">{subName}</p>}
    </div>
  );

  const addressContent = typeIsAdaptive ? (
    <Truncate className={Styles[addressStyle]} ellipsis="..." start={4} end={4} text={addressToShow} />
  ) : (
    <p className={cnTw('inline-block break-all', Styles[addressStyle])}>{addressToShow}</p>
  );

  return (
    <div className={cnTw('flex items-center gap-x-1', className)}>
      {showIcon && (
        <Identicon address={currentAddress} signType={signType} size={size} background={false} canCopy={canCopy} />
      )}
      {nameContent || addressContent}
    </div>
  );
};

export default ChainAddress;
