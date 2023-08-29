import { cnTw, copyToClipboard, toShortAddress } from '@renderer/shared/lib/utils';
import { IconSize } from '@renderer/shared/ui/types';
import { ButtonIcon, Identicon, Truncate } from '@renderer/shared/ui';
import { AccountId, Address, SigningType } from '@renderer/domain/shared-kernel';
import { getAddress } from '@renderer/entities/account';

type AddressType = 'full' | 'short' | 'adaptive';

type WithAccountId = {
  accountId: AccountId;
  addressPrefix?: number;
};

type WithAddress = {
  address: Address;
};

type Props = IconSize & {
  className?: string;
  type?: AddressType;
  addressFont?: string;
  signType?: SigningType;
  name?: string;
  symbols?: number;
  canCopy?: boolean;
  showIcon?: boolean;
  canCopySubName?: boolean;
} & (WithAccountId | WithAddress);

export const AddressWithName = ({
  className,
  symbols,
  signType,
  name,
  size,
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
          <ButtonIcon
            icon="copy"
            size="sm"
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
    <div className={cnTw('flex items-center gap-x-2', className)}>
      {showIcon && <Identicon address={currentAddress} size={size} background={false} canCopy={canCopy} />}
      <div className="truncate">
        {firstLine}
        {secondLine}
      </div>
    </div>
  );
};
