import { AccountAddress, getAddress, AccountAddressProps, useAddressInfo } from '@renderer/entities/wallet';
import { InfoPopover, Icon } from '@renderer/shared/ui';
import { toAccountId, transferableAmount, cnTw } from '@renderer/shared/lib/utils';
import { useBalance, AssetBalance } from '@renderer/entities/asset';
import type { Explorer, Asset, ChainId } from '@renderer/shared/core';

type Props<T extends any> = {
  explorers?: Explorer[];
  value: T;
  onSelected: (value: T) => void;
  chainId: ChainId;
  asset: Asset;
} & AccountAddressProps;

export const SelectableSignatory = <T extends any>({
  explorers,
  size = 20,
  value,
  onSelected,
  chainId,
  asset,
  name,
  ...addressProps
}: Props<T>) => {
  const address = getAddress(addressProps);

  const { getLiveBalance } = useBalance();
  const popoverItems = useAddressInfo(address, explorers, true);
  const balance = getLiveBalance(toAccountId(address), chainId, asset.assetId.toString());

  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary active:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <AccountAddress addressFont="text-body text-inherit" size={size} name={name} {...addressProps} />
      <InfoPopover data={popoverItems}>
        <Icon name="info" size={14} className="ml-2 mr-auto" />
      </InfoPopover>
      {balance && asset && (
        <AssetBalance
          value={transferableAmount(balance)}
          asset={asset}
          className="text-body text-inherit ml-auto mr-6"
        />
      )}
      <Icon name="right" className={cnTw(!balance && 'ml-auto')} size={20} />
    </button>
  );
};
