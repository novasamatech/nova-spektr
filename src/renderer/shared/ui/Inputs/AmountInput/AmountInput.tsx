import { useCallback, useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { AssetBalance, AssetIcon, Asset } from '@renderer/entities/asset';
import { cleanAmount, cnTw, formatGroups, validatePrecision, validateSymbols } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText, HelpText, TitleText } from '../../Typography';
import Input from '../Input/Input';
import { IconButton } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { currencyModel, useCurrencyRate } from '@renderer/entities/price';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | string[];
  invalid?: boolean;
  showCurrency?: boolean;
  onChange?: (value: string) => void;
};

export const AmountInput = ({
  name,
  value,
  asset,
  balancePlaceholder,
  balance,
  placeholder,
  disabled,
  invalid,
  showCurrency = true,
  onChange,
}: Props) => {
  const { t } = useI18n();
  const rate = useCurrencyRate(asset.priceId, showCurrency);
  const activeCurrency = useUnit(currencyModel.$activeCurrency);
  const [currencyMode, toggleCurrencyMode] = useToggle(false);
  const [internalValue, setInternalValue] = useState(value);

  const handleChange = (amount: string) => {
    const cleanedAmount = cleanAmount(amount);
    setInternalValue(cleanedAmount);

    if (validateSymbols(cleanedAmount) && (currencyMode || validatePrecision(cleanedAmount, asset.precision))) {
      onChange?.(currencyMode && rate ? (Number(cleanedAmount) * (1 / rate)).toString() : cleanedAmount);
    } else {
      onChange?.(value);
    }
  };

  useEffect(() => {
    if (currencyMode && rate) {
      setInternalValue((Number(value) * rate).toString());
    }
  }, [currencyMode]);

  const getBalance = useCallback(() => {
    if (!balance) return;

    if (Array.isArray(balance)) {
      return (
        <span className="flex gap-x-1">
          <AssetBalance className="text-text-tertiary text-footnote" value={balance[0]} asset={asset} />
          <span>-</span>
          <AssetBalance className="text-text-tertiary text-footnote" value={balance[1]} asset={asset} />
        </span>
      );
    }

    return (
      <AssetBalance
        className="inline text-text-tertiary text-footnote"
        value={balance}
        asset={asset}
        showIcon={false}
      />
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

  const currencyIcon = showCurrency && activeCurrency && (
    <div className="flex items-center gap-x-1 min-w-fit">
      <div className="relative rounded-full bg-token-background border border-token-border p-[1px] w-8 h-8">
        <TitleText align="center" className="text-white">
          {activeCurrency.symbol || activeCurrency.code}
        </TitleText>
      </div>
      <TitleText>{activeCurrency.code}</TitleText>
    </div>
  );

  const prefixElement = (
    <div className="flex items-center gap-x-1 min-w-fit">
      <AssetIcon src={asset.icon} name={asset.name} size={28} className="flex" />
      <TitleText>{asset.symbol}</TitleText>
    </div>
  );

  const suffixElement = showCurrency && rate && (
    <div className="flex flex-row gap-x-2 absolute right-3 bottom-2">
      <IconButton name="swapArrow" alt="swap input to currency" size={16} onClick={toggleCurrencyMode} />
      <HelpText className="uppercase text-text-tertiary">
        {currencyMode ? `${value} ${asset.symbol}` : `${activeCurrency?.symbol} ${Number(value) * rate}`}
      </HelpText>
    </div>
  );

  return (
    <Input
      name={name}
      className={cnTw('text-right text-title font-manrope', activeCurrency && 'mb-4')}
      wrapperClass="py-2 items-start"
      label={label}
      value={formatGroups(currencyMode ? internalValue : value)}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={currencyMode ? currencyIcon : prefixElement}
      suffixElement={suffixElement}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};
