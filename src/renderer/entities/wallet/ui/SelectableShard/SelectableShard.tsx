import { cnTw } from '@renderer/shared/lib/utils';
import { BodyText, Checkbox, HelpText, Icon, Identicon, InfoPopover, Truncate } from '@renderer/shared/ui';
import { Address, Explorer } from '@renderer/shared/core';
import { useAddressInfo } from '../../lib/useAddressInfo';

type Props = {
  name: string;
  className?: string;
  address: Address;
  checked: boolean;
  truncate?: boolean;
  semiChecked?: boolean;
  explorers?: Explorer[];
  onChange: (value: boolean) => void;
};

export const SelectableShard = ({
  className,
  name,
  address,
  semiChecked,
  checked,
  truncate,
  explorers,
  onChange,
}: Props) => {
  const popoverItems = useAddressInfo({ address, explorers });

  return (
    <Checkbox
      checked={checked}
      className={cnTw(
        'flex items-center gap-x-2 px-2 py-1.5 hover:bg-action-background-hover group rounded',
        className,
      )}
      semiChecked={semiChecked}
      onChange={(event) => onChange(event.target?.checked)}
    >
      <Identicon address={address} size={20} background={false} canCopy={false} />
      <div className="truncate mr-auto">
        <BodyText>{name}</BodyText>
        {truncate ? (
          <Truncate text={address} className="text-text-tertiary text-help-text" />
        ) : (
          <HelpText className="text-text-tertiary">{address}</HelpText>
        )}
      </div>
      <InfoPopover data={popoverItems} className="w-[230px]" position="right-0 top-full">
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </InfoPopover>
    </Checkbox>
  );
};
