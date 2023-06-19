import cnTw from '@renderer/shared/utils/twMerge';
import { formatBalance } from '@renderer/shared/utils/balance';
import { Asset } from '@renderer/domain/asset';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  value: string;
  asset: Asset; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
  imgClassName?: string;
  wrapperClassName?: string;
};

const BalanceNew = ({
  value,
  asset,
  className,
  showIcon,
  imgClassName = 'bg-token-background',
  wrapperClassName,
}: Props) => {
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
      <img src={icon} alt={name} width={28} height={28} className={cnTw('rounded-full', imgClassName)} />
      {balance}
    </span>
  );
};

export default BalanceNew;
