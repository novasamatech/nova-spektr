import { formatBalance } from '@renderer/services/balance/common/utils';
import { Asset } from '@renderer/domain/asset';
import { BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  value: string;
  asset: Asset; // maybe change type to Asset | number to allow pass just asset id and then get asset by id
  className?: string;
  showIcon?: boolean;
};

const TokenBalance = ({ value, asset, className, showIcon = true }: Props) => {
  const { t } = useI18n();
  const { precision, symbol, icon } = asset;
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, precision);

  const balanceValue = t('assetBalance.number', {
    value: formattedValue,
    maximumFractionDigits: decimalPlaces,
  });

  const balance = (
    <BodyText className={className}>
      {balanceValue} {suffix} {symbol}
    </BodyText>
  );

  if (!showIcon) {
    return balance;
  }

  return (
    <div className="flex items-center gap-2">
      <img src={icon} alt={symbol} width={28} height={28} className="bg-black" />
      {balance}
    </div>
  );
};

export default TokenBalance;
