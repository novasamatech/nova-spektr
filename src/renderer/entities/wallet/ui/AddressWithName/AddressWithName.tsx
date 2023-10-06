import { cnTw, toShortAddress, copyToClipboard } from '@renderer/shared/lib/utils';
import { Identicon, IconButton, Truncate } from '@renderer/shared/ui';
import { AccountAddressProps, getAddress } from '../AccountAddress/AccountAddress';

type Props = {
  canCopySubName?: boolean;
} & AccountAddressProps;

export const AddressWithName = ({
  className,
  symbols,
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
    <div className={cnTw('flex items-center gap-x-2', className)}>
      {showIcon && <Identicon address={currentAddress} size={size} background={false} canCopy={canCopy} />}
      <div className="truncate">
        {firstLine}
        {secondLine}
      </div>
    </div>
  );
};
