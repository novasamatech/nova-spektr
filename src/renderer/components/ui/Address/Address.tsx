import { HTMLAttributes } from 'react';
import cn from 'classnames';

import Truncate from '../Truncate/Truncate';
import { Identicon } from '@renderer/components/ui';
import { getShortAddress } from '@renderer/utils/strings';

type AddressType = 'full' | 'short' | 'adaptive';
type AddressStyle = 'small' | 'normal' | 'large';

const Styles: Record<AddressStyle, string> = {
  small: 'text-2xs text-neutral-variant font-normal',
  normal: 'text-xs leading-4 text-neutral-variant font-normal',
  large: 'text-sm text-gray-500',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  address: string;
  type?: AddressType;
  addressStyle?: AddressStyle;
  size?: number;
  symbols?: number;
  noCopy?: boolean;
}

const Address = ({ address, className, symbols, size = 16, addressStyle = 'normal', type = 'full', noCopy }: Props) => {
  const theme = 'polkadot';
  const addressToShow = type === 'short' ? getShortAddress(address, symbols) : address;

  if (['short', 'full'].includes(type)) {
    return (
      <div className={cn('flex items-center gap-x-1', className)}>
        <Identicon address={address} size={size} theme={theme} background={false} noCopy={noCopy} />
        <p className={cn('inline-block break-all', Styles[addressStyle])}>{addressToShow}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-x-1', className)}>
      <Identicon address={address} size={size} theme={theme} background={false} noCopy={noCopy} />
      <Truncate className={Styles[addressStyle]} ellipsis="..." start={4} end={4} text={addressToShow} />
    </div>
  );
};

export default Address;
