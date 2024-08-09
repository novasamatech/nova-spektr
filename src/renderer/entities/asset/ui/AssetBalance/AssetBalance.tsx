import { type BN } from '@polkadot/util';

import { useI18n } from '@app/providers';
import { type Asset, type AssetByChains } from '@shared/core';
import { cnTw, formatBalance } from '@shared/lib/utils';
import { AssetIcon } from '@entities/asset';

type Props = {
  value: BN | string;
  asset?: Asset | AssetByChains; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
  imgClassName?: string;
  wrapperClassName?: string;
  showSymbol?: boolean;
};

export const AssetBalance = ({
  value,
  asset,
  className,
  showIcon,
  imgClassName,
  wrapperClassName,
  showSymbol = true,
}: Props) => {
  const { t } = useI18n();

  if (!asset) {
    return null;
  }

  const { precision, symbol, icon, name } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  const balance = (
    <span className={cnTw('text-body text-text-primary', className)}>
      {balanceValue} {suffix} {showSymbol && symbol}
    </span>
  );

  if (!showIcon) {
    return balance;
  }

  return (
    <span className={cnTw('flex items-center gap-x-2', wrapperClassName)}>
      <AssetIcon src={icon} size={28} name={name} className={imgClassName} />
      {balance}
    </span>
  );
};
