import cn from 'classnames';
import { FieldError } from 'react-hook-form';

import { Balance, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';

type Props = {
  value: string;
  name: string;
  balance: string;
  asset: Asset;
  error?: FieldError;
  onChange?: (...event: any[]) => void;
};

const Amount = ({ value, name, balance, asset, error, onChange }: Props) => {
  const { t } = useI18n();

  return (
    <Input
      label={
        <div className="flex justify-between">
          <p>{t('transfer.amountLabel')}</p>
          <div className="flex gap-x-1">
            <p className="font-normal">{t('transfer.transferable')}:</p>
            <Balance className="text-neutral font-semibold" value={balance} precision={asset.precision} />
            <p className="text-neutral">{asset.symbol}</p>
          </div>
        </div>
      }
      prefixElement={
        <div className="flex items-center gap-1">
          <div
            className={cn(
              'relative flex items-center justify-center  border rounded-full w-6 h-6 box-border',
              'border-shade-30 bg-shade-70',
            )}
          >
            <img src={asset.icon} alt={asset.name} width={26} height={26} />
          </div>
          <p className="text-lg">{asset.symbol}</p>
        </div>
      }
      name={name}
      type="text"
      className="w-full text-xl font-semibold text-right"
      placeholder={t('transfer.amountLabel')}
      invalid={Boolean(error)}
      value={value}
      onChange={onChange}
    />
  );
};

export default Amount;
