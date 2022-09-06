import cn from 'classnames';

import { formatBalance } from '@renderer/services/balance/common/utils';
import { useI18n } from '@renderer/context/I18nContext';

interface Props {
  value: string;
  precision: number;
  className?: string;
}

const Balance = ({ value, precision, className }: Props) => {
  const { t } = useI18n();
  const { value: formatedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  return (
    <span className={cn(className)}>{`${t('number', {
      value: formatedValue,
      maximumFractionDigits: decimalPlaces,
    })}${suffix}`}</span>
  );
};

export default Balance;
