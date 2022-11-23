import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';

import Amount from '@renderer/components/common/Amount/Amount';
import { Button, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Wallet } from '@renderer/domain/wallet';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferable } from '@renderer/services/balance/common/utils';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { formatAddress, toPublicKey, validateAddress } from '@renderer/utils/address';
import Fee from './Fee';
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

const Transfer = ({ onCreateTransaction, wallet, asset, connection }: Props) => {
  const { t } = useI18n();

  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();

  const [balance, setBalance] = useState('');
  const [fee, setFee] = useState('');

  const currentAddress = formatAddress(
    wallet.mainAccounts[0].accountId || wallet.chainAccounts[0].accountId || '',
    connection.addressPrefix,
  );

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
    formState: { isValid },
  } = useForm<TransferForm>({
    mode: 'onChange',
    defaultValues: { amount: '', address: '' },
  });

  const address = watch('address');
  const amount = watch('amount');

  const addTransaction: SubmitHandler<TransferForm> = async ({ address, amount }) => {
    if (!currentAddress || !amount) return;

    onCreateTransaction({ address, amount });
  };

  const transaction = {
    type: TransactionType.TRANSFER,
    address: currentAddress,
    chainId: connection.chainId,
    args: {
      value: formatAmount(amount, asset.precision),
      dest: address,
    },
  } as Transaction;

  useEffect(() => {
    (async () => {
      if (!connection.api || !amount || !validateAddress(address)) return;

      setFee(await getTransactionFee(transaction, connection.api));
    })();
  }, [transaction, connection.api]);

  const validateBalance = async (amount: string) => {
    if (!fee || !balance) return false;

    return parseInt(fee) + parseInt(formatAmount(amount, asset.precision)) <= parseInt(balance);
  };

  return (
    <div>
      <div className="w-[500px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
        {connection && wallet && <SelectedAddress wallet={wallet} connection={connection} />}

        <form
          id="transferForm"
          className="flex flex-col gap-5 bg-white shadow-surface p-5 rounded-2xl w-full"
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
              <Input
                prefixElement={
                  value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                }
                invalid={!!error}
                value={value}
                name="address"
                className="w-full"
                label={t('transfer.recipientLabel')}
                placeholder={t('transfer.recipientLabel')}
                onChange={onChange}
              />
            )}
          />

          <Controller
            name="amount"
            control={control}
            rules={{ required: true, validate: (v) => Number(v) > 0 && validateBalance(v) }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Amount value={value} name="amount" asset={asset} balance={balance} error={error} onChange={onChange} />
            )}
          />

          <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
            <p>{t('transfer.networkFee')}</p>

            <Fee
              className="text-neutral font-semibold"
              connection={connection}
              wallet={wallet}
              transaction={transaction}
            />
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
