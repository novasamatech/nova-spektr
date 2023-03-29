import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { ApiPromise } from '@polkadot/api';

import { pasteAddressHandler, toPublicKey, isAddressValid, formatAddress } from '@renderer/shared/utils/address';
import { getAssetId } from '@renderer/shared/utils/assets';
import { Button, AmountInput, Icon, Identicon, Input, InputHint, Block, InputArea } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset, AssetType } from '@renderer/domain/asset';
import { Transaction, TransactionType, MiltisigTxInitStatus } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountID, ChainId, Threshold } from '@renderer/domain/shared-kernel';
import { Fee } from '@renderer/components/common';
import Deposit from '@renderer/components/common/Deposit/Deposit';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';

type TransferFormData = {
  amount: string;
  destination: AccountID;
  description: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  address?: AccountID;
  threshold: Threshold;
  asset: Asset;
  nativeToken: Asset;
  addressPrefix: number;
  onSubmit: (transaction: Transaction) => void;
};

export const TransferForm = ({
  api,
  chainId,
  network,
  address,
  threshold,
  asset,
  nativeToken,
  addressPrefix,
  onSubmit,
}: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getMultisigTxs } = useMultisigTx();
  const { getTransactionHash } = useTransaction();

  const [fee, setFee] = useState('');
  const [deposit, _] = useState('');
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
    defaultValues: { amount: '', destination: '', description: '' },
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

    if (address && amount && isAddressValid(destination)) {
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

  const validateBalance = (amount: string): boolean => {
    if (!balance) return false;

    return new BN(formatAmount(amount, asset.precision)).lte(new BN(balance));
  };

  const validateBalanceForFee = (amount: string): boolean => {
    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(fee).lte(new BN(nativeTokenBalance));
    }

    return new BN(fee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const validateBalanceForDeposit = (amount: string): boolean => {
    if (!balance) return false;

    if (nativeTokenBalance) {
      return new BN(deposit).lte(new BN(nativeTokenBalance));
    }

    return new BN(deposit).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const updateFee = async (fee: string) => {
    setFee(fee);

    if (fee !== '0') {
      await trigger('amount');
    }
  };

  const submitTransaction = async () => {
    if (!transaction) return;

    // TODO: check existing MST operation
    const { callHash } = getTransactionHash(transaction, api);
    const multisigTxs = await getMultisigTxs({ chainId, callHash, status: MiltisigTxInitStatus.SIGNING });
    console.log(multisigTxs);

    onSubmit(transaction);
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(submitTransaction)}>
      <Block className="flex flex-col gap-y-5 p-5 mb-2.5">
        <p className="text-neutral text-base">
          <Trans t={t} i18nKey="transfer.formTitle" values={{ asset: asset.symbol, network }} />
        </p>
        <Controller
          name="destination"
          control={control}
          rules={{ required: true, validate: isAddressValid }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2.5">
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
            </div>
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
              insufficientBalanceForDeposit: validateBalanceForDeposit,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2.5">
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
            </div>
          )}
        />

        <div className="grid grid-flow-row grid-cols-2 gap-y-5">
          <p className="uppercase text-neutral-variant text-2xs">{t('transfer.networkFee')}</p>
          <Fee
            className="text-neutral justify-self-end text-2xs font-semibold"
            api={api}
            asset={nativeToken}
            transaction={transaction}
            onFeeChange={updateFee}
          />
          {threshold >= 1 && (
            <>
              <p className="uppercase text-neutral-variant text-2xs">{t('transfer.networkDeposit')}</p>
              <Deposit
                className="text-neutral justify-self-end text-2xs font-semibold"
                api={api}
                asset={nativeToken}
                threshold={threshold}
                onDepositChange={() => {}}
              />
            </>
          )}
        </div>
      </Block>

      <Block>
        <Controller
          name="description"
          control={control}
          rules={{ maxLength: 120 }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-y-2.5">
              <InputArea
                className="w-full"
                label="Operation name (optional)"
                placeholder="Choose an operation name"
                invalid={Boolean(error)}
                rows={2}
                value={value}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'maxLength'} variant="error">
                <Trans t={t} i18nKey="transfer.descriptionLengthError" values={{ maxLength: 120 }} />
              </InputHint>
            </div>
          )}
        />
      </Block>

      <Button
        variant="fill"
        pallet="primary"
        weight="lg"
        className="w-fit flex-0 m-auto mt-5"
        type="submit"
        disabled={!isValid}
      >
        {t('transfer.continueButton')}
      </Button>
    </form>
  );
};
