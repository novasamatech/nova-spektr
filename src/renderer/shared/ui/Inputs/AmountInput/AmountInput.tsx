import { useUnit } from 'effector-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset } from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import {
  cleanAmount,
  cnTw,
  formatBalance,
  formatFiatBalance,
  formatGroups,
  getRoundedValue,
  toFixedNotation,
  validatePrecision,
  validateSymbols,
} from '@shared/lib/utils';
import { IconButton } from '@shared/ui';
import { AssetBalance, AssetIcon } from '@entities/asset';
import { currencyModel, useCurrencyRate } from '@entities/price';
import { FootnoteText, HelpText, TitleText } from '../../Typography';
import { Input } from '../Input/Input';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | string[] | ReactNode;
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
  const [currencyMode, toggleCurrencyMode] = useToggle();
  const [inputValue, setInputValue] = useState(value);
  const [assetValue, setAssetValue] = useState(value);

  const handleChange = (amount: string) => {
    const cleanedAmount = cleanAmount(amount);

    const calculatedAssetValue = rate && toFixedNotation(Number(cleanedAmount) * (1 / rate), asset.precision);

    const isSymbolsValid = validateSymbols(cleanedAmount);
    const isAssetValueValid = currencyMode || validatePrecision(cleanedAmount, asset.precision);
    const isCurrencyValueValid =
      !currencyMode || (calculatedAssetValue && validatePrecision(calculatedAssetValue, asset.precision));

    if (isSymbolsValid && isAssetValueValid && isCurrencyValueValid) {
      setInputValue(cleanedAmount);
      const newAssetValue =
        currencyMode && calculatedAssetValue ? getRoundedValue(calculatedAssetValue, 1, 0, 1) : cleanedAmount;
      setAssetValue(newAssetValue);
      onChange?.(newAssetValue);
    } else {
      onChange?.(value);
    }
  };

  const currencyValue = rate ? toFixedNotation(Number(value ?? 0) * rate) : undefined;

  useEffect(() => {
    if (value) {
      if (currencyMode) {
        setInputValue(getRoundedValue(currencyValue, 1, 0));
      } else {
        handleChange(getRoundedValue(value || undefined, 1, 0, 1));
      }
    }
  }, [currencyMode]);

  useEffect(() => {
    // handle value change from parent component
    if (value !== assetValue) {
      if (currencyMode) {
        setInputValue(getRoundedValue(currencyValue, 1, 0));
        setAssetValue(value);
      } else {
        setInputValue(value);
        setAssetValue(value);
      }
    }
  }, [value]);

  const getBalance = useCallback(() => {
    if (!balance) {
      return;
    }

    if (Array.isArray(balance)) {
      return (
        <span className="flex gap-x-1">
          <AssetBalance className="text-text-primary text-footnote" value={balance[0]} asset={asset} />
          <span>-</span>
          <AssetBalance className="text-text-primary text-footnote" value={balance[1]} asset={asset} />
        </span>
      );
    }
    if (typeof balance === 'string') {
      return (
        <AssetBalance
          className="inline text-text-primary text-footnote"
          value={balance}
          asset={asset}
          showIcon={false}
        />
      );
    }

    return balance;
  }, [balance]);

  const label = (
    <div className="flex justify-between items-center gax-x-2">
      <FootnoteText className="text-text-tertiary">{placeholder}</FootnoteText>
      <span className="flex items-center gap-x-1.5">
        <FootnoteText as="span" className="text-text-tertiary">
          {balancePlaceholder || t('general.input.availableLabel')}
        </FootnoteText>
        <FootnoteText as="span">{getBalance()}</FootnoteText>
      </span>
    </div>
  );

  const currencyIcon = showCurrency && activeCurrency && (
    <div className="flex items-center gap-x-1 min-w-fit">
      <div className="relative rounded-full bg-token-background border border-token-border p-[1px] w-8 h-8 flex items-center justify-center">
        {activeCurrency.symbol ? (
          <TitleText align="center" className="text-white">
            {activeCurrency.symbol}
          </TitleText>
        ) : (
          <HelpText align="center" className="text-white">
            {activeCurrency.code}
          </HelpText>
        )}
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

  const { value: altValue, suffix: altValueSuffix } = currencyMode
    ? formatBalance(value || undefined)
    : formatFiatBalance(currencyValue);

  const suffixElement = showCurrency && rate && (
    <div className="flex items-center gap-x-2 absolute right-3 bottom-3">
      <IconButton
        name="swapArrow"
        alt={t(currencyMode ? 'transfer.swapToCryptoModeAlt' : 'transfer.swapToCurrencyModeAlt')}
        onClick={toggleCurrencyMode}
      />
      <FootnoteText className="uppercase text-text-tertiary">
        {currencyMode
          ? `${altValue}${altValueSuffix} ${asset.symbol}`
          : `${activeCurrency?.symbol || activeCurrency?.code} ${altValue}${altValueSuffix}`}
      </FootnoteText>
    </div>
  );

  return (
    <Input
      name={name}
      className={cnTw('text-right text-title font-manrope', activeCurrency && rate && 'mb-7')}
      wrapperClass="py-3 items-start"
      label={label}
      value={formatGroups(inputValue)}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={currencyMode ? currencyIcon : prefixElement}
      suffixElement={suffixElement}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};
