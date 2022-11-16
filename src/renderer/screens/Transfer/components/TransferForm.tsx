import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import cn from 'classnames';
import { Trans } from 'react-i18next';

import { Balance, Button, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { formatAddress, toPublicKey, validateAddress } from '@renderer/utils/address';
import { Wallet } from '@renderer/domain/wallet';
import { ExtendedChain } from '@renderer/services/network/common/types';
import SelectedAddress from './SelectedAddress';
import Fee from './Fee';
import { TransactionType } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferable } from '@renderer/services/balance/common/utils';

type TransferForm = {
  address: string;
  amount: string;
};

type Props = {
  onCreateTransaction: (data: TransferForm) => void;
  wallet: Wallet;
  asset: Asset;
  connection: ExtendedChain;
};

const Transfer = ({ onCreateTransaction, wallet, asset, connection }: Props) => {
  const { t } = useI18n();

  const { getBalance } = useBalance();

  const [balance, setBalance] = useState('');

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
            render={({ field: { onChange, value }, fieldState: { isTouched, error } }) => (
              <Input
                prefixElement={
                  value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                }
                value={value}
                name="address"
                className="w-full"
                label="Recipient"
                placeholder="Recipient"
                onChange={onChange}
              />
            )}
          />

          <Controller
            name="amount"
            control={control}
            rules={{ validate: (v) => Number(v) > 0 }}
            render={({ field: { onChange, value } }) => (
              <Input
                prefixElement={
                  <div className="flex items-center gap-1">
                    <div
                      className={cn(
                        'relative flex items-center justify-center  border rounded-full w-6 h-6 box-border',
                        'border-shade-30 bg-shade-70',
                      )}
                    >
                      <img src={asset.icon} alt="" width={26} height={26} />
                    </div>
                    <p className="text-lg">{asset.symbol}</p>
                  </div>
                }
                onChange={onChange}
                value={value}
                type="number"
                name="amount"
                className="w-full text-xl font-semibold text-right"
                label={
                  <div className="flex justify-between">
                    <div>Amount</div>
                    <div>
                      <span className="font-normal">{t('transfer.transferable')}:</span>{' '}
                      <Balance className="text-neutral font-semibold" value={balance} precision={asset.precision} />{' '}
                      {asset.symbol}
                    </div>
                  </div>
                }
                placeholder="Amount"
              />
            )}
          />

          <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
            <div>{t('transfer.networkFee')}</div>
            {amount && address && (
              <Fee
                className="text-neutral font-semibold"
                connection={connection}
                wallet={wallet}
                transaction={{
                  type: TransactionType.TRANSFER,
                  address: currentAddress,
                  chainId: connection.chainId,
                  args: {
                    value: amount,
                    dest: address,
                  },
                }}
              />
            )}
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
