import cn from 'classnames';
import { useCallback } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { FootnoteText } from '../../Typography';
import { BalanceNew } from '@renderer/components/common';
import Input from '../Input/Input';

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
        <span className="flex gap-x-1">
          <BalanceNew className="text-neutral font-medium" value={balance[0]} asset={asset} />
          <span>-</span>
          <BalanceNew className="text-neutral font-medium" value={balance[1]} asset={asset} />
        </span>
      );
    }

    const shownBalance = Array.isArray(balance) && isSameBalance ? balance[0] : (balance as string);

    return <BalanceNew className="inline text-text-primary" value={shownBalance} asset={asset} showIcon={false} />;
  }, [balance]);

  const label = (
    <div className="flex justify-between items-center gax-x-2">
      <FootnoteText className="text-text-tertiary">{placeholder}</FootnoteText>
      <span className="flex gap-x-1.5">
        <FootnoteText className="text-text-tertiary">
          {balancePlaceholder || t('general.input.availableLabel')}
        </FootnoteText>
        <FootnoteText> {getBalance()}</FootnoteText>
      </span>
    </div>
  );

  const prefixElement = (
    <div className="flex items-center gap-x-1">
      <div className={cn('border rounded-full w-6 h-6 box-border border-shade-30 bg-shade-70')}>
        <img src={asset.icon} alt={asset.name} width={26} height={26} />
      </div>
      <p className="text-lg">{asset.symbol}</p>
    </div>
  );

  return (
    <Input
      name={name}
      className="text-right text-title font-extrabold"
      label={label}
      value={value}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={prefixElement}
      disabled={disabled}
      onChange={onChange}
    />
  );
};

export default AmountInput;
