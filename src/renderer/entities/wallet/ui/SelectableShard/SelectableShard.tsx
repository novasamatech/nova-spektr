import { IconTheme } from '@polkadot/react-identicon/types';
import theme from 'tailwindcss/defaultTheme';

import { cnTw } from '@shared/lib/utils';
import { BodyText, Checkbox, HelpText, Icon, Identicon, InfoPopover, Truncate } from '@shared/ui';
import { Address, Explorer, KeyType } from '@shared/core';
import { useAddressInfo } from '../../lib/useAddressInfo';
import { KeyIcon } from '@entities/wallet/ui/Cards/DerivedAccount';
import { IconNames } from '@shared/ui/Icon/data';

type Props = {
  name?: string;
  className?: string;
  address: Address;
  checked: boolean;
  truncate?: boolean;
  semiChecked?: boolean;
  explorers?: Explorer[];
  keyType?: KeyType;
  identicon?: IconTheme;
  onChange: (value: boolean) => void;
};

export const SelectableShard = ({
  className,
  name,
  address,
  semiChecked,
  keyType,
  identicon,
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
        keyType && 'gap-x-3',
        className,
      )}
      semiChecked={semiChecked}
      onChange={(event) => onChange(event.target?.checked)}
    >
      <div className="relative">
        <Identicon address={address} size={20} background={false} canCopy={false} theme={identicon} />
        {keyType && (
          <div className="absolute p-[3px] border border-container-border top-0 right-[-50%] rounded-full bg-white">
            <Icon name={KeyIcon[keyType] as IconNames} size={12} />
          </div>
        )}
      </div>
      <div className="truncate mr-auto">
        {name && <BodyText className={theme && 'text-text-primary'}>{name}</BodyText>}
        {!theme &&
          (truncate ? (
            <Truncate text={address} className="text-text-tertiary text-help-text" />
          ) : (
            <HelpText className="text-text-tertiary">{address}</HelpText>
          ))}
        {!name && <Truncate text={address} className="text-text-primary text-body-text" />}
      </div>
      <InfoPopover data={popoverItems} className="w-[230px]" position="right-0 top-full">
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </InfoPopover>
    </Checkbox>
  );
};
