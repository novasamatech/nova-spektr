import { cnTw } from '@shared/lib/utils';
import { BodyText, Checkbox, HelpText, Icon, Identicon, Truncate } from '@shared/ui';
import { Address, Explorer } from '@shared/core';

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

      <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
    </Checkbox>
  );
};
