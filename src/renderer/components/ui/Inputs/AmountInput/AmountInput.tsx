import cn from 'classnames';
import { useCallback } from 'react';

import { Balance, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | [string, string];
  invalid?: boolean;
  onChange?: (value: string) => void;
};

const AmountInput = ({
  name,
  value,
  asset,
  balancePlaceholder,
  balance,
  placeholder,
  disabled,
  invalid,
  onChange,
}: Props) => {
  const { t } = useI18n();

  const getBalance = useCallback(() => {
    if (!balance) return;

    const isSameBalance = balance[0] == balance[1] || (balance[0] === '0' && !balance[1]);

    if (Array.isArray(balance) && !isSameBalance) {
      return (
        <div className="flex gap-x-1">
          <Balance className="text-neutral font-semibold" value={balance[0]} precision={asset.precision} />
          <span>-</span>
          <Balance
            className="text-neutral font-semibold"
            value={balance[1]}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      );
    }

    const shownBalance = Array.isArray(balance) && isSameBalance ? balance[0] : (balance as string);

    return (
      <Balance
        className="text-neutral font-semibold"
        value={shownBalance}
        precision={asset.precision}
        symbol={asset.symbol}
      />
    );
  }, [balance]);

  const label = (
    <div className="flex justify-between">
      <p>{t('general.input.amountLabel')}</p>
      <div className="flex gap-x-1">
        <p className="font-normal">{balancePlaceholder || t('general.input.transferableLabel')}:</p>
        {getBalance()}
      </div>
    </div>
  );

  const prefixElement = (
    <div className="flex items-center gap-1">
      <div className={cn('border rounded-full w-6 h-6 box-border border-shade-30 bg-shade-70')}>
        <img src={asset.icon} alt={asset.name} width={26} height={26} />
      </div>
      <p className="text-lg">{asset.symbol}</p>
    </div>
  );

  return (
    <Input
      name={name}
      label={balance ? label : ''}
      prefixElement={prefixElement}
      className="w-full text-xl font-semibold text-right"
      placeholder={placeholder}
      invalid={invalid}
      value={value}
      disabled={disabled}
      onChange={onChange}
    />
  );
};

export default AmountInput;
