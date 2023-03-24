import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { ApiPromise } from '@polkadot/api';

import {
  getAssetId,
  pasteAddressHandler,
  toPublicKey,
  validateAddress,
  formatAddress,
} from '@renderer/shared/utils/address';
import { Button, AmountInput, Icon, Identicon, Input, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset, AssetType } from '@renderer/domain/asset';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Fee } from '@renderer/components/common';

type TransferFormData = {
  amount: string;
  destination: AccountID;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  address?: AccountID;
  asset: Asset;
  addressPrefix: number;
  onSubmit: (transaction: Transaction) => void;
};

export const TransferForm = ({ api, chainId, network, address, asset, addressPrefix, onSubmit }: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();

  const [fee, setFee] = useState('');
  const [balance, setBalance] = useState('');
  const [nativeTokenBalance, setNativeTokenBalance] = useState<string>();
  const [transaction, setTransaction] = useState<Transaction>();

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    resetField,
    formState: { isValid },
  } = useForm<TransferFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  const amount = watch('amount');
  const destination = watch('destination');

  useEffect(() => {
    const publicKey = toPublicKey(address) || '0x0';

    if (asset.assetId !== 0) {
      getBalance(publicKey, chainId, '0').then((balance) => {
        setNativeTokenBalance(balance ? transferableAmount(balance) : '0');
      });
    }

    getBalance(publicKey, chainId, asset.assetId.toString()).then((balance) => {
      setBalance(balance ? transferableAmount(balance) : '0');
    });
  }, [address]);

  useEffect(() => {
    let txPayload: Transaction | undefined = undefined;

    if (address && amount && validateAddress(destination)) {
      const TransferType: Record<AssetType, TransactionType> = {
        [AssetType.ORML]: TransactionType.ORML_TRANSFER,
        [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
      };

      txPayload = {
        chainId,
        address,
        type: asset.type ? TransferType[asset.type] : TransactionType.TRANSFER,
        args: {
          dest: formatAddress(destination, addressPrefix),
          value: formatAmount(amount, asset.precision),
          asset: getAssetId(asset),
        },
      };
    }

    setTransaction(txPayload);
  }, [address, destination, amount]);

  const validateBalanceForFee = (amount: string): boolean => {
    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    return new BN(fee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const validateBalance = (amount: string): boolean => {
    if (!balance) return false;

    return new BN(formatAmount(amount, asset.precision)).lte(new BN(balance));
  };

  const updateFee = async (fee: string) => {
    setFee(fee);

    if (fee !== '0') {
      await trigger('amount');
    }
  };

  const submitTransaction = () => {
    if (!transaction) return;

    onSubmit(transaction);
  };

  return (
    <>
      <form
        id="transferForm"
        className="flex flex-col gap-y-5 w-full p-5 bg-white shadow-surface rounded-2xl"
        onSubmit={handleSubmit(submitTransaction)}
      >
        <p>
          <Trans t={t} i18nKey="transfer.formTitle" values={{ asset: asset.symbol, network }} />
        </p>
        <Controller
          name="destination"
          control={control}
          rules={{ required: true, validate: validateAddress }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <Input
                prefixElement={
                  value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                }
                suffixElement={
                  value ? (
                    <button
                      className="text-neutral"
                      type="button"
                      onClick={() => resetField('destination', { defaultValue: '' })}
                    >
                      <Icon name="clearOutline" />
                    </button>
                  ) : (
                    <Button variant="outline" pallet="primary" onClick={pasteAddressHandler(onChange)}>
                      {t('general.button.pasteButton')}
                    </Button>
                  )
                }
                className="w-full"
                invalid={Boolean(error)}
                value={value}
                label={t('transfer.recipientLabel')}
                placeholder={t('transfer.recipientLabel')}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'validate'} variant="error">
                {t('transfer.incorrectRecipientError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('transfer.requiredRecipientError')}
              </InputHint>
            </>
          )}
        />

        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: validateBalance,
              insufficientBalanceForFee: validateBalanceForFee,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                value={value}
                placeholder={t('transfer.amountPlaceholder')}
                asset={asset}
                balance={balance}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                {t('transfer.notEnoughBalanceError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                {t('transfer.notEnoughBalanceForFeeError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
              <InputHint active={error?.type === 'notZero'} variant="error">
                {t('transfer.requiredAmountError')}
              </InputHint>
            </>
          )}
        />

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('transfer.networkFee')}</p>
          <Fee
            className="text-neutral font-semibold"
            api={api}
            asset={asset}
            transaction={transaction}
            onFeeChange={updateFee}
          />
        </div>
      </form>

      <Button
        variant="fill"
        pallet="primary"
        weight="lg"
        className="w-fit flex-0 m-auto mt-5"
        type="submit"
        form="transferForm"
        disabled={!isValid}
      >
        {t('transfer.continueButton')}
      </Button>
    </>
  );
};
