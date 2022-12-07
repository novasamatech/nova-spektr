import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';

import Amount from '@renderer/components/common/Amount/Amount';
import { Fee } from '@renderer/components/common';
import { Button, Icon, Identicon, Input, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset, AssetType } from '@renderer/domain/asset';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Wallet } from '@renderer/domain/wallet';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferable } from '@renderer/services/balance/common/utils';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { formatAddress, getAssetId, toPublicKey, validateAddress } from '@renderer/utils/address';
import SelectedAddress from './SelectedAddress';

type TransferForm = {
  address: string;
  amount: string;
};

type Props = {
  wallet: Wallet;
  asset: Asset;
  connection: ExtendedChain;
  onCreateTransaction: (data: TransferForm) => void;
};

const getTransactionType = (assetType: AssetType | undefined): TransactionType => {
  if (assetType === AssetType.STATEMINE) {
    return TransactionType.ASSET_TRANSFER;
  }

  if (assetType === AssetType.ORML) {
    return TransactionType.ORML_TRANSFER;
  }

  return TransactionType.TRANSFER;
};

const Transfer = ({ onCreateTransaction, wallet, asset, connection }: Props) => {
  const { t } = useI18n();

  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();

  const [balance, setBalance] = useState('');
  const [fee, setFee] = useState('');
  const [transaction, setTransaction] = useState<Transaction>();

  const accountId = wallet.mainAccounts[0].accountId || wallet.chainAccounts[0].accountId;
  const currentAddress = formatAddress(accountId, connection.addressPrefix);

  useEffect(() => {
    (async () => {
      const balance = await getBalance(
        toPublicKey(currentAddress) || '0x',
        connection.chainId,
        asset.assetId.toString(),
      );

      setBalance(balance ? transferable(balance) : '0');
    })();
  }, [currentAddress, connection.chainId, asset.assetId]);

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { isValid },
  } = useForm<TransferForm>({
    mode: 'onChange',
    defaultValues: { amount: '', address: '' },
  });

  const address = watch('address');
  const amount = watch('amount');

  const addTransaction: SubmitHandler<TransferForm> = ({ address, amount }) => {
    if (!currentAddress || !amount) return;

    onCreateTransaction({ address, amount });
  };

  useEffect(() => {
    setTransaction({
      type: getTransactionType(asset.type),
      address: currentAddress,
      chainId: connection.chainId,
      args: {
        value: formatAmount(amount, asset.precision),
        dest: address,
        asset: getAssetId(asset),
      },
    } as Transaction);
  }, [address, amount]);

  useEffect(() => {
    (async () => {
      if (!connection.api || !amount || !validateAddress(transaction?.args.dest) || !transaction) return;

      setFee(await getTransactionFee(transaction, connection.api));
    })();
  }, [address, amount]);

  useEffect(() => {
    if (!fee) return;

    trigger('amount');
  }, [fee]);

  const validateBalanceForFee = (amount: string): boolean => {
    if (!balance) return false;
    const currentFee = fee || '0';

    return new BN(currentFee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balance));
  };

  const validateBalance = (amount: string): boolean => {
    if (!balance) return false;

    return new BN(formatAmount(amount, asset.precision)).lte(new BN(balance));
  };

  return (
    <div>
      <div className="w-[500px] rounded-2lg bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
        {connection && wallet && (
          <SelectedAddress wallet={wallet} addressPrefix={connection.addressPrefix} explorers={connection.explorers} />
        )}

        <form
          id="transferForm"
          className="flex flex-col gap-5 bg-white shadow-surface p-5 rounded-2lg w-full"
          onSubmit={handleSubmit(addTransaction)}
        >
          <p>
            <Trans t={t} i18nKey="transfer.formTitle" values={{ asset: asset.symbol, network: connection.name }} />
          </p>
          <Controller
            name="address"
            control={control}
            rules={{ required: true, validate: validateAddress }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <>
                <Input
                  prefixElement={
                    value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                  }
                  invalid={Boolean(error)}
                  value={value}
                  name="address"
                  className="w-full"
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
                <Amount value={value} name="amount" asset={asset} balance={balance} onChange={onChange} />
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

            <Fee className="text-neutral font-semibold" api={connection.api} asset={asset} transaction={transaction} />
          </div>
        </form>
      </div>

      <Button
        disabled={!isValid}
        variant="fill"
        weight="lg"
        pallet="primary"
        className="w-fit flex-0 m-auto mt-5"
        type="submit"
        form="transferForm"
      >
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};

export default Transfer;
