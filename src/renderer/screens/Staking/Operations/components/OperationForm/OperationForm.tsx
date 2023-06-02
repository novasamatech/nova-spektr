import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect, FormEvent, ReactNode } from 'react';
import { Trans, TFunction } from 'react-i18next';

import { Identicon } from '@renderer/components/ui';
import { Button, AmountInput, InputHint, Combobox, RadioGroup, Input } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { RewardsDestination } from '@renderer/domain/stake';
import { validateAddress, toAddress } from '@renderer/shared/utils/address';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId } from '@renderer/domain/shared-kernel';
import { RadioResult, RadioOption } from '@renderer/components/ui-redesign/RadioGroup/common/types';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useAccount } from '@renderer/services/account/accountService';
import { getStakeAccountOption } from '../../common/utils';

const getDestinations = (t: TFunction): RadioOption<RewardsDestination>[] => {
  const options = [
    { value: RewardsDestination.RESTAKE, title: t('staking.bond.restakeRewards') },
    { value: RewardsDestination.TRANSFERABLE, title: t('staking.bond.transferableRewards') },
  ];

  return options.map((dest, index) => ({
    id: index.toString(),
    value: dest.value,
    title: dest.title,
  }));
};

type FormData = {
  amount: string;
  destination?: Address;
  description?: string;
};

type Field = {
  //todo better to add types here to avoid misspelling
  name: string;
  value?: string;
  disabled?: boolean;
};

type Props = {
  chainId: ChainId;
  canSubmit: boolean;
  addressPrefix: number;
  fields: Field[];
  balanceRange?: [string, string];
  asset: Asset;
  children: ((errorType: string) => ReactNode) | ReactNode;
  validateBalance?: (amount: string) => boolean;
  validateFee?: (amount: string) => boolean;
  validateDeposit?: (amount: string) => boolean;
  onFormChange?: (data: FormData) => void;
  onSubmit: (data: FormData) => void;
};

export const OperationForm = ({
  chainId,
  canSubmit,
  addressPrefix,
  fields,
  balanceRange,
  asset,
  children,
  validateBalance = () => true,
  validateFee = () => true,
  validateDeposit = () => true,
  onFormChange,
  onSubmit,
}: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();
  const destinations = getDestinations(t);

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeDestination, setActiveDestination] = useState<RadioResult<RewardsDestination>>(destinations[0]);

  const amountField = fields.find((f) => f.name === 'amount');
  const destinationField = fields.find((f) => f.name === 'destination');
  const descriptionField = fields.find((f) => f.name === 'description');

  const {
    handleSubmit,
    control,
    setValue,
    trigger,
    watch,
    register,
    unregister,
    formState: { isValid, errors },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      amount: amountField?.value || '0',
      destination: destinationField?.value || '',
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
    if (activeDestination?.value === RewardsDestination.RESTAKE) {
      unregister('destination');
    } else {
      register('destination');
    }
  }, [activeDestination?.value]);

  useEffect(() => {
    const payoutAccounts = dbAccounts.reduce<DropdownOption<Address>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const option = getStakeAccountOption(account, { asset, addressPrefix });
        const address = toAddress(option.value.accountId, { prefix: addressPrefix });
        acc.push({ ...option, value: address });
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [dbAccounts.length]);

  const getBalance = (): string | [string, string] => {
    if (!balanceRange) return '';

    return balanceRange[0] === balanceRange[1] ? balanceRange[0] : balanceRange;
  };

  const handleFormChange = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const amount = data.get('amount')?.toString() || '';
    const destination = data.get('destination')?.toString() || '';

    onFormChange?.({ amount, destination });
  };

  const errorType = errors.amount?.type || errors.destination?.type || errors.description?.type || '';

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)} onChange={handleFormChange}>
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
                insufficientBalanceForFee: validateFee,
                insufficientBalanceForDeposit: validateDeposit,
              },
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <>
                <AmountInput
                  name="amount"
                  placeholder={t('staking.bond.amountPlaceholder')}
                  balancePlaceholder={t('staking.bond.availableBalancePlaceholder')}
                  value={value}
                  disabled={amountField.disabled}
                  balance={getBalance()}
                  asset={asset}
                  invalid={Boolean(error)}
                  onChange={onChange}
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
              </>
            )}
          />
        )}

        {destinationField && (
          <RadioGroup
            label={t('staking.bond.rewardsDestinationLabel')}
            className="col-span-2"
            activeId={activeDestination?.id}
            options={destinations}
            onChange={setActiveDestination}
          >
            <RadioGroup.Option option={destinations[0]} />
            <RadioGroup.Option option={destinations[1]}>
              <Controller
                name="destination"
                control={control}
                rules={{ required: true, validate: validateAddress }}
                render={({ field: { onChange }, fieldState: { error } }) => (
                  <>
                    <Combobox
                      placeholder={t('staking.bond.payoutAccountPlaceholder')}
                      options={payoutAccounts}
                      disabled={destinationField.disabled}
                      invalid={Boolean(error)}
                      prefixElement={<Identicon address={destination} size={20} background={false} canCopy={false} />}
                      onChange={(option) => onChange(option.value)}
                    />
                    <InputHint active={error?.type === 'isAddress'} variant="error">
                      {t('staking.bond.incorrectAddressError')}
                    </InputHint>
                    <InputHint active={error?.type === 'required'} variant="error">
                      {t('staking.bond.requiredAddressError')}
                    </InputHint>
                  </>
                )}
              />
            </RadioGroup.Option>
          </RadioGroup>
        )}

        {descriptionField && (
          <Controller
            name="description"
            control={control}
            rules={{ maxLength: 120 }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2.5">
                <Input
                  label={t('staking.bond.descriptionLabel')}
                  className="w-full"
                  placeholder={t('staking.bond.descriptionPlaceholder')}
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

        {typeof children === 'function' ? children(errorType) : children}
      </div>

      <Button className="w-fit flex-0 mt-7 ml-auto" type="submit" disabled={!isValid || !canSubmit}>
        {t('staking.bond.continueButton')}
      </Button>
    </form>
  );
};
