import { AccountId, Explorer, Wallet } from '@renderer/shared/core';
import { useAddressInfo, WalletIcon } from '@renderer/entities/wallet';
import { FootnoteText, Icon, InfoPopover } from '@renderer/shared/ui';
import { cnTw, toAddress } from '@renderer/shared/lib/utils';

type Props = {
  wallet: Wallet;
  iconSize?: number;
  className?: string;
  explorers?: Explorer[];
  addressPrefix?: number;
  accountId: AccountId;
};

export const WalletRow = ({ wallet, className, iconSize = 16, addressPrefix, accountId, explorers }: Props) => {
  const address = toAddress(accountId, { prefix: addressPrefix });
  const popoverItems = useAddressInfo(address, explorers, false);

  return (
    <InfoPopover data={popoverItems} className="w-[230px]">
      <div
        className={cnTw(
          'flex items-center max-w-full gap-x-2 px-2 py-[3px] cursor-pointer text-text-secondary group hover:bg-action-background-hover hover:text-text-primary rounded',
          className,
        )}
      >
        <WalletIcon type={wallet.type} size={iconSize} />
        <FootnoteText className="text-inherit inline">{wallet.name}</FootnoteText>
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};
