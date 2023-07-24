import { cnTw, formatBalance } from '@renderer/shared/lib/utils';
import { Asset } from '@renderer/domain/asset';
import { useI18n } from '@renderer/app/providers';
import { AssetIcon } from '@renderer/shared/ui';

type Props = {
  value: string;
  asset: Asset; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
  imgClassName?: string;
  wrapperClassName?: string;
};

const BalanceNew = ({ value, asset, className, showIcon, imgClassName, wrapperClassName }: Props) => {
  const { t } = useI18n();
  const { precision, symbol, icon, name } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  const balance = (
    <span className={cnTw('text-body text-text-primary', className)}>
      {balanceValue} {suffix} {symbol}
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

export default BalanceNew;
