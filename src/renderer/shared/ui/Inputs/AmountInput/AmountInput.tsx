import { useCallback } from 'react';

import { useI18n } from '@renderer/app/providers';
import { FootnoteText, TitleText } from '../../Typography';
// FIXME components in shared shouldn't use components from entity so we need to move it to entity
import { AssetBalance, AssetIcon, Asset } from '@renderer/entities/asset';
import Input from '../Input/Input';
import { cleanAmount, formatGroups, validatePrecision, validateSymbols } from '@renderer/shared/lib/utils';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | string[];
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

  const handleChange = (amount: string) => {
    const cleanedAmount = cleanAmount(amount);

    if (validateSymbols(cleanedAmount) && validatePrecision(cleanedAmount, asset.precision)) {
      onChange?.(cleanedAmount);
    } else {
      onChange?.(value);
    }
  };

  const getBalance = useCallback(() => {
    if (!balance) return;

    if (Array.isArray(balance)) {
      return (
        <span className="flex gap-x-1">
          <AssetBalance className="text-text-primary text-footnote" value={balance[0]} asset={asset} />
          <span>-</span>
          <AssetBalance className="text-text-primary text-footnote" value={balance[1]} asset={asset} />
        </span>
      );
    }

    return (
      <AssetBalance className="inline text-text-primary text-footnote" value={balance} asset={asset} showIcon={false} />
    );
  }, [balance]);

  const label = (
    <div className="flex justify-between items-center gax-x-2">
      <FootnoteText className="text-text-tertiary">{placeholder}</FootnoteText>
      <span className="flex items-center gap-x-1.5">
        <FootnoteText as="span" className="text-text-tertiary">
          {balancePlaceholder || t('general.input.availableLabel')}
        </FootnoteText>
        <FootnoteText as="span"> {getBalance()}</FootnoteText>
      </span>
    </div>
  );

  const prefixElement = (
    <div className="flex items-center gap-x-1 min-w-fit">
      <AssetIcon src={asset.icon} name={asset.name} size={28} className="flex" />
      <TitleText>{asset.symbol}</TitleText>
    </div>
  );

  return (
    <Input
      name={name}
      className="text-right text-title font-manrope"
      label={label}
      value={formatGroups(value)}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={prefixElement}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};

export default AmountInput;
