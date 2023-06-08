import cnTw from '@renderer/shared/utils/twMerge';
import { Identicon } from '@renderer/components/ui';
import { SigningType, AccountId, Address } from '@renderer/domain/shared-kernel';
import { toShortAddress } from '@renderer/shared/utils/address';
import Truncate from '@renderer/components/ui/Truncate/Truncate';
import { getAddress } from '../AccountAddress/AccountAddress';
import { IconButton } from '@renderer/components/ui-redesign';
import { copyToClipboard } from '@renderer/shared/utils/strings';

type AddressType = 'full' | 'short' | 'adaptive';

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

export type Props = {
  className?: string;
  type?: AddressType;
  addressFont?: string;
  signType?: SigningType;
  name?: string;
  size?: number;
  symbols?: number;
  canCopy?: boolean;
  showIcon?: boolean;
  canCopySubName?: boolean;
} & (WithAccountId | WithAddress);

const AddressWithName = ({
  className,
  symbols,
  signType,
  name,
  size = 16,
  addressFont,
  type = 'full',
  canCopy = true,
  showIcon = true,
  canCopySubName = false,
  ...props
}: Props) => {
  const currentAddress = getAddress(props);
  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? toShortAddress(currentAddress, symbols) : currentAddress;

  const nameContent = name && <p className={cnTw('truncate', addressFont)}>{name}</p>;

  const addressContent = typeIsAdaptive ? (
    <Truncate className={cnTw(addressFont)} ellipsis="..." start={4} end={4} text={addressToShow} />
  ) : (
    <p className={cnTw('inline-block break-all', addressFont)}>{addressToShow}</p>
  );

  const firstLine = <div className="text-body text-text-primary">{nameContent || addressContent}</div>;
  const secondLine = nameContent && addressContent && (
    <div className="text-help-text text-text-tertiary">
      {canCopySubName ? (
        <div className="flex items-center gap-1">
          {addressContent}
          <IconButton
            name="copy"
            size={16}
            className="text-text-tertiary p-0"
            onClick={() => copyToClipboard(currentAddress)}
          />
        </div>
      ) : (
        addressContent
      )}
    </div>
  );

  return (
    <div className={cnTw('flex font-inter items-center gap-x-2', className)}>
      {showIcon && (
        <Identicon address={currentAddress} signType={signType} size={size} background={false} canCopy={canCopy} />
      )}
      <div className="truncate">
        {firstLine}
        {secondLine}
      </div>
    </div>
  );
};

export default AddressWithName;
