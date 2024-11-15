import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { fromPrecision, toPrecision } from '@/shared/lib/utils';
import { InputHint } from '@/shared/ui';
import { AmountInput } from '@/features/assets-balances';

type Props = {
  value: BN | null;
  asset: Asset;
  availableBalance: BN;
  hasError: boolean;
  errorText: string;
  onChange: (amount: BN) => void;
};

export const Amount = ({ value, availableBalance, errorText, asset, hasError, onChange }: Props) => {
  const { t } = useI18n();

  const handleChange = (amount: string) => {
    onChange(toPrecision(amount, asset.precision));
  };

  return (
    <div className="flex flex-col gap-2">
      <AmountInput
        placeholder={t('governance.vote.field.balance')}
        showCurrency={false}
        balance={availableBalance.toString()}
        value={value ? fromPrecision(value, asset.precision).toString() : ''}
        invalid={hasError}
        asset={asset}
        onChange={handleChange}
      />
      <InputHint variant="error" active={hasError}>
        {t(errorText)}
      </InputHint>
    </div>
  );
};
