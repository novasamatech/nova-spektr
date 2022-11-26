/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import { ReactNode, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Amount from '@renderer/components/common/Amount/Amount';
import { Button, Dropdown, Icon, InputHint, Radio } from '@renderer/components/ui';
import { RadioOption } from '@renderer/components/ui/Radio/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

type BondForm = {
  amount: string;
  destination: string;
  payoutAccount: string;
};

type Props = {
  walletsIds: string[];
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  onResult: () => void;
};

const InitBond = ({ walletsIds, api, chainId, asset, onResult }: Props) => {
  const { t } = useI18n();
  // @ts-ignore
  const { getBalance } = useBalance();

  // @ts-ignore
  const [balances, setBalances] = useState<string[]>([]);

  // useEffect(() => {
  //   if (!api || asset) return;
  //
  //   (async () => {
  //     const balance = await getBalance(toPublicKey(currentAddress) || '0x', asset.assetId.toString());
  //
  //     setBalance(balance ? transferable(balance) : '0');
  //   })();
  // }, [api]);

  const {
    handleSubmit,
    control,
    watch,
    formState: { isValid },
  } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '', payoutAccount: '' },
  });

  const am = watch('amount');
  const destination = watch('destination');
  const pay = watch('payoutAccount');
  console.log(am, destination, pay);

  if (!asset) {
    return <div>LOADING</div>;
  }

  const initBond: SubmitHandler<BondForm> = ({ amount, destination, payoutAccount }) => {
    console.log(amount, destination, payoutAccount);
  };

  const getDestinations = (): RadioOption<string>[] => {
    const setElement = (label: string, amount: string, apy: number): ReactNode => (
      <div className="w-full grid grid-cols-2">
        <p className="text-neutral text-lg leading-5 font-semibold">{label}</p>
        <p className="text-shade-30 text-lg leading-5 font-semibold text-right">{amount} DOT</p>
        <p className="text-success text-xs">{apy}% APY</p>
      </div>
    );

    return [
      {
        id: 1,
        value: '123',
        element: setElement('Restake rewards', '12.25', 16.04),
      },
      {
        id: 2,
        value: '4444',
        element: setElement('Transferable rewards', '12.01', 15.57),
      },
    ];
  };

  const onChangeWallets = () => {};

  return (
    <div className="w-[600px] flex flex-col items-center m-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Dropdown placeholder="Select" options={[]} onChange={onChangeWallets} />
      </div>
      <form
        id="initBondForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(initBond)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              // insufficientBalance: validateBalance,
              // insufficientBalanceForFee: validateBalanceForFee,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <Amount value={value} name="amount" balance={'1'} asset={asset} invalid={!!error} onChange={onChange} />
              <InputHint active={error?.type === 'required'} variant="error">
                REQUIRED
              </InputHint>
            </>
          )}
        />

        <div className="grid grid-cols-2">
          <p className="text-neutral text-xs uppercase font-bold">Rewards destination</p>
          <a
            className="flex gap-x-1 justify-self-end text-primary w-max"
            href={PAYOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="info" size={14} />
            <span className="underline text-xs">About rewards</span>
          </a>
          <p className="text-2xs text-neutral-variant col-span-2">Approximate amounts are calculated yearly</p>
          <Controller
            name="destination"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Radio
                selected={value}
                options={getDestinations()}
                className="col-span-2"
                optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
                onChange={onChange}
              />
            )}
          />
        </div>
        {/*{destination === '4444' && (*/}
        {/*  <Controller*/}
        {/*    name="payoutAccount"*/}
        {/*    control={control}*/}
        {/*    render={({ field: { value, onChange } }) => (*/}
        {/*      <Dropdown*/}
        {/*        label={<p>Hello map</p>}*/}
        {/*        placeholder="Select a payout account"*/}
        {/*        selected={value}*/}
        {/*        options={[]}*/}
        {/*        onChange={onChange}*/}
        {/*      />*/}
        {/*    )}*/}
        {/*  />*/}
        {/*)}*/}
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('transfer.networkFee')}</p>

          <p>0.34 DOT</p>
          {/*<Fee*/}
          {/*  className="text-neutral font-semibold"*/}
          {/*  api={connection.api}*/}
          {/*  accountId={accountId}*/}
          {/*  asset={asset}*/}
          {/*  addressPrefix={connection.addressPrefix}*/}
          {/*  transaction={transaction}*/}
          {/*/>*/}
        </div>
      </form>
      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        Continue
      </Button>
    </div>
  );
};

export default InitBond;
