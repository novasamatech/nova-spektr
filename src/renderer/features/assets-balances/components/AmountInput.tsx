import { useUnit } from 'effector-react';
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import {
  cleanAmount,
  cnTw,
  formatBalance,
  formatFiatBalance,
  formatGroups,
  getRoundedValue,
  nonNullable,
  toFixedNotation,
  validatePrecision,
  validateSymbols,
} from '@/shared/lib/utils';
import { FootnoteText, HelpText, IconButton, TitleText } from '@/shared/ui';
import { AssetBalance, AssetIcon } from '@/entities/asset';
import { currencyModel, useCurrencyRate } from '@/entities/price';

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

  const [inputValue, setInputValue] = useState(value);
  const [assetValue, setAssetValue] = useState(value);

  const [currencyMode, toggleCurrencyMode] = useToggle();

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
    if (!value) return;

    if (currencyMode) {
      setInputValue(getRoundedValue(currencyValue, 1, 0));
    } else {
      handleChange(getRoundedValue(value || undefined, 1, 0, 1));
    }
  }, [currencyMode]);

  // handle value change from parent component
  useEffect(() => {
    if (value === assetValue) return;

    if (currencyMode) {
      setInputValue(getRoundedValue(currencyValue, 1, 0));
      setAssetValue(value);
    } else {
      setInputValue(value);
      setAssetValue(value);
    }
  }, [value]);

  const getBalance = useCallback(() => {
    if (!balance) return;

    if (Array.isArray(balance)) {
      return (
        <span className="flex gap-x-1">
          <AssetBalance className="text-footnote text-text-primary" value={balance[0]} asset={asset} />
          <span>-</span>
          <AssetBalance className="text-footnote text-text-primary" value={balance[1]} asset={asset} />
        </span>
      );
    }

    if (typeof balance === 'string') {
      return (
        <AssetBalance
          className="inline text-footnote text-text-primary"
          value={balance}
          asset={asset}
          showIcon={false}
        />
      );
    }

    return balance;
  }, [balance]);

  const label = (
    <div className="gax-x-2 flex items-center justify-between">
      <FootnoteText className="text-text-tertiary">{placeholder}</FootnoteText>
      <span className="flex items-center gap-x-1.5">
        <FootnoteText as="span" className="text-text-tertiary">
          {balancePlaceholder || t('general.input.availableLabel')}
        </FootnoteText>
        <FootnoteText as="span">{getBalance()}</FootnoteText>
      </span>
    </div>
  );

  const currencyIcon = showCurrency && nonNullable(rate) && nonNullable(activeCurrency) && (
    <div className="flex min-w-fit items-center gap-x-1">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-token-border bg-token-background p-[1px]">
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
    <div className="flex min-w-fit items-center gap-x-1">
      <AssetIcon asset={asset} size={32} />
      <TitleText>{asset.symbol}</TitleText>
    </div>
  );

  const { value: altValue, suffix: altValueSuffix } = currencyMode
    ? formatBalance(value || undefined)
    : formatFiatBalance(currencyValue);

  const suffixElement = showCurrency && nonNullable(rate) && nonNullable(activeCurrency) && (
    <div className="flex items-center gap-x-2">
      <IconButton name="swapArrow" onClick={toggleCurrencyMode} />
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

const DEFAULT_LEFT_PADDING = 11;
const EXTENDED_LEFT_PADDING = 19;

type InputProps = {
  name?: string;
  value: string;
  placeholder: string;
  label: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  prefixElement: ReactNode;
  suffixElement?: ReactNode;
  onChange: (value: string) => void;
};
export const Input = ({
  label,
  name,
  value,
  placeholder,
  invalid,
  disabled,
  prefixElement,
  suffixElement,
  onChange,
}: InputProps) => {
  const id = useId();

  const prefixRef = useRef<HTMLDivElement>(null);

  const [paddingLeft, setPaddingLeft] = useState(DEFAULT_LEFT_PADDING);

  useLayoutEffect(() => {
    if (!prefixRef.current) return;

    setPaddingLeft(EXTENDED_LEFT_PADDING + prefixRef.current.getBoundingClientRect().width);
  }, [prefixElement]);

  return (
    <div className="flex flex-col gap-y-2">
      <label htmlFor={id} className="text-footnote font-medium text-text-tertiary">
        {label}
      </label>
      <div className="relative w-full">
        <div
          ref={prefixRef}
          className={cnTw('absolute left-3 flex', {
            'top-3': suffixElement,
            'top-1/2 -translate-y-1/2': !suffixElement,
          })}
        >
          {prefixElement}
        </div>
        <input
          className={cnTw(
            'w-full rounded p-[11px]',
            'border border-filter-border bg-input-background',
            'placeholder:text-text-secondary focus:outline-none',
            'text-right font-manrope text-title text-text-primary outline-offset-1',
            {
              'pb-[37px]': suffixElement,
              'border-filter-border-negative': invalid,
              'focus-within:border-active-container-border': !invalid,
              'hover:shadow-card-shadow': !disabled,
              'bg-transparent text-text-tertiary placeholder:text-text-tertiary': disabled,
            },
          )}
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          style={{ paddingLeft }}
          type="text"
          onChange={(event) => onChange?.(event.target.value)}
        />
        <div className={cnTw(!suffixElement && 'hidden', 'absolute bottom-3 right-3')}>{suffixElement}</div>
      </div>
    </div>
  );
};
