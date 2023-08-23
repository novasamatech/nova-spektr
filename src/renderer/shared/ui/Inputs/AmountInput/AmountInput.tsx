import { useCallback } from 'react';

// FIXME components in shared shouldn't use components from entity so we need to move it to entity
import { AssetBalance, AssetIcon, Asset } from '@renderer/entities/asset';
import { cleanAmount, cnTw, formatGroups, validatePrecision, validateSymbols } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText, HelpText, TitleText } from '../../Typography';
import { Input } from '../Input/Input';

type Props = {
  name?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  asset: Asset;
  balancePlaceholder?: string;
  balance?: string | string[];
  invalid?: boolean;
  altValue?: string;
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
  altValue,
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

  const prefixElement = (
    <div className="flex items-center gap-x-1 min-w-fit">
      <AssetIcon src={asset.icon} name={asset.name} size={28} className="flex" />
      <TitleText>{asset.symbol}</TitleText>
    </div>
  );

  const suffixElement = (
    <HelpText className="absolute uppercase right-3 bottom-2 text-text-tertiary">{altValue}</HelpText>
  );

  return (
    <Input
      name={name}
      className={cnTw('text-right text-title font-manrope', altValue && 'mb-4')}
      wrapperClass="py-2 items-start"
      label={label}
      value={formatGroups(value)}
      placeholder={t('transfer.amountPlaceholder')}
      invalid={invalid}
      prefixElement={prefixElement}
      suffixElement={altValue && suffixElement}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};
