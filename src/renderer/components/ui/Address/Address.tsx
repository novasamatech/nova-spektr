import { HTMLAttributes } from 'react';
import Identicon from '@polkadot/react-identicon';
import cn from 'classnames';

import Truncate from '../Truncate/Truncate';
import { getShortAddress } from '@renderer/utils/strings';

type AddressType = 'full' | 'short' | 'adaptive';
type AddressStyle = 'small' | 'normal' | 'large';

const Styles: Record<AddressStyle, string> = {
  small: 'text-2xs text-neutral-variant font-normal',
  normal: 'text-xs text-neutral-variant font-normal',
  large: 'text-sm text-gray-500',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  address: string;
  type?: AddressType;
  addressStyle?: AddressStyle;
  size?: number;
}

const Address = ({ address, className, size = 16, addressStyle = 'normal', type = 'full' }: Props) => {
  const theme = 'polkadot';
  const addressToShow = type === 'short' ? getShortAddress(address) : address;

  if (['short', 'full'].includes(type)) {
    return (
      <span className={cn('inline align-middle', className)}>
        <Identicon className="align-middle" value={address} size={size} theme={theme} />
        <span className={cn('break-all ml-1', Styles[addressStyle])}>{addressToShow}</span>
      </span>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      <Identicon value={address} size={size} theme={theme} className="mr-1" />
      <Truncate className={cn(Styles[addressStyle])} ellipsis="..." start={4} end={4} text={addressToShow} />
    </div>
  );
};

export default Address;
