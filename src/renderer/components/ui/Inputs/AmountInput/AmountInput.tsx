import cn from 'classnames';

import { Balance, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  asset: Asset;
  balance?: string | [string, string];
  invalid?: boolean;
  onChange?: (...event: any[]) => void;
};

const AmountInput = ({ name, value, asset, balance, placeholder, invalid, onChange }: Props) => {
  const { t } = useI18n();

  const label = (
    <div className="flex justify-between">
      <p>{t('general.input.amountLabel')}</p>
      <div className="flex gap-x-1">
        <p className="font-normal">{t('general.input.transferableLabel')}:</p>
        {Array.isArray(balance) ? (
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
        ) : (
          balance && (
            <Balance
              className="text-neutral font-semibold"
              value={balance}
              precision={asset.precision}
              symbol={asset.symbol}
            />
          )
        )}
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
      label={label}
      prefixElement={prefixElement}
      type="text"
      className="w-full text-xl font-semibold text-right"
      placeholder={placeholder}
      invalid={invalid}
      value={value}
      onChange={onChange}
    />
  );
};

export default AmountInput;
