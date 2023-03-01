import cn from 'classnames';

import { Identicon } from '@renderer/components/ui';
import { SigningType } from '@renderer/domain/shared-kernel';
import { getShortAddress } from '@renderer/shared/utils/strings';
import Truncate from '../Truncate/Truncate';

type AddressType = 'full' | 'short' | 'adaptive';
type AddressStyle = 'small' | 'normal' | 'large';

const Styles: Record<AddressStyle, string> = {
  small: 'text-2xs text-neutral-variant font-normal',
  normal: 'text-xs leading-4 text-neutral-variant font-normal',
  large: 'text-base text-neutral',
};

type Props = {
  address: string;
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
};

const Address = ({
  address,
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
}: Props) => {
  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? getShortAddress(address, symbols) : address;

  const nameContent = (name || subName) && (
    <div className="flex flex-col items-start">
      <p className="text-neutral text-sm font-semibold leading-4">{name}</p>
      {subName && <p className="text-neutral-variant text-2xs">{subName}</p>}
    </div>
  );

  const addressContent = typeIsAdaptive ? (
    <Truncate className={Styles[addressStyle]} ellipsis="..." start={4} end={4} text={addressToShow} />
  ) : (
    <p className={cn('inline-block break-all', Styles[addressStyle])}>{addressToShow}</p>
  );

  return (
    <div className={cn('flex items-center gap-x-1', className)}>
      {showIcon && <Identicon address={address} signType={signType} size={size} background={false} canCopy={canCopy} />}
      {nameContent || addressContent}
    </div>
  );
};

export default Address;
