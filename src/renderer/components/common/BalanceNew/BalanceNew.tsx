import cn from 'classnames';

import { formatBalance } from '@renderer/shared/utils/balance';
import { Asset } from '@renderer/domain/asset';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  value: string;
  asset: Asset; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
};

const BalanceNew = ({ value, asset, className = 'text-body text-text-primary', showIcon = true }: Props) => {
  const { t } = useI18n();
  const { precision, symbol, icon, name } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  const balance = (
    <p className={cn('font-inter', className)}>
      {balanceValue} {suffix} {symbol}
    </p>
  );

  if (!showIcon) {
    return balance;
  }

  return (
    <div className="flex items-center gap-x-2">
      <img src={icon} alt={name} width={28} height={28} className="bg-black rounded-full" />
      {balance}
    </div>
  );
};

export default BalanceNew;
