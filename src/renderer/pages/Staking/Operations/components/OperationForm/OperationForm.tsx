import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useState, useEffect, ReactNode } from 'react';
import { Trans, TFunction } from 'react-i18next';
import { useUnit } from 'effector-react';

import { AmountInput, Button, Combobox, Identicon, Input, InputHint, RadioGroup } from '@shared/ui';
import { useI18n } from '@app/providers';
import { validateAddress, isStringsMatchQuery, toAddress } from '@shared/lib/utils';
import { RadioOption } from '@shared/ui/RadioGroup/common/types';
import { DropdownOption, ComboboxOption } from '@shared/ui/Dropdowns/common/types';
import { getDestinationAccounts, getPayoutAccountOption } from '../../common/utils';
import type { Asset, Address, ChainId, AccountId } from '@shared/core';
import { RewardsDestination } from '@shared/core';
import { walletModel, accountUtils } from '@entities/wallet';
import { useAssetBalances } from '@entities/balance';
import { operationFormModel } from './operation-form-model';

const getDestinations = (t: TFunction): RadioOption<RewardsDestination>[] => {
  const Options = [
    { value: RewardsDestination.RESTAKE, title: t('staking.bond.restakeRewards') },
    { value: RewardsDestination.TRANSFERABLE, title: t('staking.bond.transferableRewards') },
  ];

  return Options.map((dest, index) => ({
    id: index.toString(),
    value: dest.value,
    title: dest.title,
  }));
};

type FormData<T extends Address | RewardsDestination> = {
  amount: string;
  destination?: T;
  description?: string;
};

type Field = {
  name: string;
  value?: string;
  disabled?: boolean;
};

type ErrorPayload = {
  invalidBalance: boolean;
  invalidFee: boolean;
  invalidDeposit: boolean;
};

type Props = {
  chainId: ChainId;
  accounts: AccountId[];
  canSubmit: boolean;
  addressPrefix: number;
  fields: Field[];
  asset: Asset;
  balanceRange?: string | string[];
  validateBalance?: (amount: string) => boolean;
  validateFee?: (amount: string) => boolean;
  validateDeposit?: (amount: string) => boolean;
  footer: ReactNode;
  header?: ReactNode | ((data: ErrorPayload) => ReactNode);
  onAmountChange?: (amount: string) => void;
  onSubmit: (data: FormData<Address>) => void;
};

export const OperationForm = ({
  chainId,
  accounts,
  canSubmit,
  addressPrefix,
  fields,
  asset,
  balanceRange,
  validateBalance = () => true,
  validateFee = () => true,
  validateDeposit = () => true,
  footer,
  header,
  onAmountChange,
  onSubmit,
}: Props) => {
  const { t } = useI18n();
  const dbAccounts = useUnit(walletModel.$accounts);
  const dbWallets = useUnit(walletModel.$wallets);
  const destinationQuery = useUnit(operationFormModel.$destinationQuery);

  const destinations = getDestinations(t);

  const [activePayout, setActivePayout] = useState<Address>('');
  const [payoutAccounts, setPayoutAccounts] = useState<ComboboxOption<Address>[]>([]);

  const destAccounts = getDestinationAccounts(dbAccounts, dbWallets, chainId);
  const payoutIds = destAccounts.map((a) => a.accountId);
  const balances = useAssetBalances({
    accountIds: payoutIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const amountField = fields.find((f) => f.name === 'amount');
  const destinationField = fields.find((f) => f.name === 'destination');
  const descriptionField = fields.find((f) => f.name === 'description');

  const {
    handleSubmit,
    control,
    setValue,
    trigger,
    watch,
    formState: { isValid, errors, isDirty },
  } = useForm<FormData<RewardsDestination>>({
    mode: 'onChange',
    defaultValues: {
      amount: amountField?.value,
      destination: destinations[0].value,
      description: descriptionField?.value || '',
    },
  });

  const destination = watch('destination');

  useEffect(() => {
    if (!amountField?.value || amountField.value === '') return;

    setValue('amount', amountField.value);
    trigger('amount');
  }, [amountField]);

  useEffect(() => {
    if (!isDirty) return;

    trigger('amount');
  }, [isDirty, accounts]);

  useEffect(() => {
    const payoutAccounts = destAccounts.reduce<DropdownOption<Address>[]>((acc, account) => {
      const isChainIdMatch = accountUtils.isChainIdMatch(account, chainId);
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      if (isChainIdMatch && isStringsMatchQuery(destinationQuery, [account.name, address])) {
        const balance = balances.find((b) => b.accountId === account.accountId);
        const option = getPayoutAccountOption(account, { asset, addressPrefix, balance });

        acc.push(option);
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [destAccounts.length, balances, destinationQuery]);

  const validateDestination = (): boolean => {
    if (destination === RewardsDestination.RESTAKE) return true;

    return Boolean(activePayout) && validateAddress(activePayout);
  };

  const submitForm: SubmitHandler<FormData<RewardsDestination>> = ({ amount, destination, description }) => {
    const destinationValue = destination === RewardsDestination.TRANSFERABLE ? activePayout : '';

    onSubmit({ amount, description, destination: destinationValue });
  };

  const submitDisabled = !isValid || !canSubmit || !validateDestination();

  const formHeader =
    typeof header === 'function'
      ? header({
          invalidBalance: errors.amount?.type === 'insufficientBalance',
          invalidFee: errors.amount?.type === 'insufficientBalanceForFee',
          invalidDeposit: errors.amount?.type === 'insufficientBalanceForDeposit',
        })
      : header;

  return (
    <form className="w-full" onSubmit={handleSubmit(submitForm)}>
      {formHeader}
      <div className="flex flex-col gap-y-5">
        {amountField && (
          <Controller
            name="amount"
            control={control}
            rules={{
              required: true,
              validate: {
                notZero: (v) => Number(v) > 0,
                insufficientBalance: validateBalance,
                insufficientBalanceForDeposit: validateDeposit,
                insufficientBalanceForFee: validateFee,
              },
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2">
                <AmountInput
                  name="amount"
                  placeholder={t('general.input.amountLabel')}
                  balancePlaceholder={t('general.input.availableLabel')}
                  value={value}
                  disabled={amountField.disabled}
                  balance={balanceRange}
                  asset={asset}
                  invalid={Boolean(error)}
                  onChange={(value) => {
                    onAmountChange?.(value);
                    onChange(value);
                  }}
                />

                <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                  {t('staking.notEnoughBalanceError')}
                </InputHint>
                <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                  {t('staking.notEnoughBalanceForFeeError')}
                </InputHint>
                <InputHint active={error?.type === 'insufficientBalanceForDeposit'} variant="error">
                  {t('staking.notEnoughBalanceForDepositError')}
                </InputHint>
                <InputHint active={error?.type === 'required'} variant="error">
                  {t('staking.requiredAmountError')}
                </InputHint>
                <InputHint active={error?.type === 'notZero'} variant="error">
                  {t('staking.requiredAmountError')}
                </InputHint>
              </div>
            )}
          />
        )}

        {destinationField && (
          <Controller
            name="destination"
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2">
                <RadioGroup
                  label={t('staking.bond.rewardsDestinationLabel')}
                  className="col-span-2"
                  activeId={destinations.find((d) => d.value === value)?.id}
                  options={destinations}
                  onChange={(option) => onChange(option.value)}
                >
                  <RadioGroup.Option option={destinations[0]} />
                  <RadioGroup.Option option={destinations[1]}>
                    <Combobox
                      placeholder={t('staking.bond.payoutAccountPlaceholder')}
                      query={destinationQuery}
                      value={activePayout}
                      options={payoutAccounts}
                      disabled={destinationField.disabled}
                      invalid={Boolean(error)}
                      prefixElement={
                        <Identicon
                          className="mr-1"
                          address={activePayout}
                          size={20}
                          background={false}
                          canCopy={false}
                        />
                      }
                      onInput={operationFormModel.events.destinationQueryChanged}
                      onChange={(option) => setActivePayout(option.value)}
                    />
                  </RadioGroup.Option>
                </RadioGroup>

                <InputHint active={!validateDestination()} variant="error">
                  {t('staking.bond.incorrectAddressError')}
                </InputHint>
              </div>
            )}
          />
        )}

        {descriptionField && (
          <Controller
            name="description"
            control={control}
            rules={{ maxLength: 120 }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2">
                <Input
                  spellCheck
                  label={t('general.input.descriptionLabel')}
                  className="w-full"
                  placeholder={t('general.input.descriptionPlaceholder')}
                  invalid={Boolean(error)}
                  disabled={descriptionField.disabled}
                  value={value}
                  onChange={onChange}
                />

                <InputHint active={error?.type === 'maxLength'} variant="error">
                  <Trans t={t} i18nKey="transfer.descriptionLengthError" values={{ maxLength: 120 }} />
                </InputHint>
              </div>
            )}
          />
        )}

        {footer}
      </div>

      <Button className="w-fit flex-0 mt-7 ml-auto" type="submit" disabled={submitDisabled}>
        {t('staking.bond.continueButton')}
      </Button>
    </form>
  );
};
