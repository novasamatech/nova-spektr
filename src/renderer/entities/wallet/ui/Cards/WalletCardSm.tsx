import { AccountId, Explorer, Wallet } from '@shared/core';
import { useAddressInfo, WalletIcon } from '../../index';
import { FootnoteText, Icon, InfoPopover } from '@shared/ui';
import { cnTw, toAddress } from '@shared/lib/utils';

type Props = {
  wallet: Wallet;
  iconSize?: number;
  className?: string;
  explorers?: Explorer[];
  addressPrefix?: number;
  accountId: AccountId;
};

export const WalletCardSm = ({ wallet, className, iconSize = 16, addressPrefix, accountId, explorers }: Props) => {
  const address = toAddress(accountId, { prefix: addressPrefix });
  const popoverItems = useAddressInfo({ address, explorers });

  return (
    <InfoPopover data={popoverItems} className="w-[230px]">
      <div
        className={cnTw(
          'group flex items-center gap-x-2 max-w-full px-2 py-[3px] cursor-pointer text-text-secondary rounded',
          'hover:bg-action-background-hover hover:text-text-primary',
          className,
        )}
      >
        <WalletIcon type={wallet.type} size={iconSize} />
        <FootnoteText className="text-inherit inline w-max">{wallet.name}</FootnoteText>
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};
