import cn from 'classnames';

import { formatBalance } from '@renderer/services/balance/common/utils';
import { useI18n } from '@renderer/context/I18nContext';

interface Props {
  value: string;
  precision: number;
  symbol?: string;
  className?: string;
}

const Balance = ({ value, precision, symbol, className }: Props) => {
  const { t } = useI18n();
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <p className={cn(className)}>
      {balanceValue}
      {suffix}
      {symbol && <span className="ml-1">{symbol}</span>}
    </p>
  );
};

export default Balance;
