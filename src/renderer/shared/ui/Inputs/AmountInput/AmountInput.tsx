import { useCallback } from 'react';

// FIXME components in shared shouldn't use components from entity so we need to move it to entity
import { AssetBalance, AssetIcon, Asset } from '@renderer/entities/asset';
import { cleanAmount, cnTw, formatGroups, validatePrecision, validateSymbols } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText, HelpText, TitleText } from '../../Typography';
import Input from '../Input/Input';
import AllIcons, { IconNames } from '@renderer/shared/ui/Icon/data';
import Icon from '../../Icon/Icon';
import { IconButton } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useCurrency } from '@renderer/shared/ui/Inputs/AmountInput/useCurrency';

const CURRENCY_PRECISION = 6;

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | string[];
  invalid?: boolean;
  currencyId?: string;
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
  currencyId,
  onChange,
}: Props) => {
  const { t } = useI18n();
  const { currency, rate } = useCurrency(asset.symbol.toLowerCase(), currencyId);
  const [currencyMode, toggleCurrencyMode] = useToggle(false);

  const handleChange = (amount: string) => {
    const cleanedAmount = cleanAmount(amount);

    if (
      validateSymbols(cleanedAmount) &&
      validatePrecision(cleanedAmount, currencyMode ? CURRENCY_PRECISION : asset.precision)
    ) {
      onChange?.(currencyMode ? (Number(cleanedAmount) * (1 / rate)).toString() : cleanedAmount);
    } else {
      onChange?.(value);
    }
  };

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

  const currencyIcon = currencyId && (
    <div className="flex items-center gap-x-1 min-w-fit">
      <div className="relative rounded-full bg-token-background border border-token-border p-[1px] min-w-fit">
        {AllIcons[currencyId as IconNames] ? (
          <Icon name={currencyId as IconNames} className="text-white" size={28} />
        ) : (
          <TitleText className="text-white">{currency.symbol}</TitleText>
        )}
      </div>
      <TitleText>{currency.code}</TitleText>
    </div>
  );

  const prefixElement = (
    <div className="flex items-center gap-x-1 min-w-fit">
      <AssetIcon src={asset.icon} name={asset.name} size={28} className="flex" />
      <TitleText>{asset.symbol}</TitleText>
    </div>
  );

  const suffixElement = (
    <div className="flex flex-row gap-x-2 absolute right-3 bottom-2">
      <IconButton name="swapArrow" alt="swap input to currency" size={16} onClick={toggleCurrencyMode} />
      <HelpText className="uppercase text-text-tertiary">
        {currencyMode ? `${value} ${asset.symbol}` : `${currency.symbol} ${Number(value) * rate}`}
      </HelpText>
    </div>
  );

  return (
    <Input
      name={name}
      className={cnTw('text-right text-title font-manrope', currencyId && 'mb-4')}
      wrapperClass="py-2 items-start"
      label={label}
      value={formatGroups(currencyMode ? (Number(value) * rate).toString() : value)}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={currencyMode ? currencyIcon : prefixElement}
      suffixElement={currencyId && suffixElement}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};
