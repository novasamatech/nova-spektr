/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Amount from '@renderer/components/common/Amount/Amount';
import { Button, Dropdown, Icon, Identicon, InputHint, RadioGroup, Select } from '@renderer/components/ui';
import { Option as DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { Option as RadioOption, ResultOption } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { WalletType } from '@renderer/domain/wallet';
import { useBalance } from '@renderer/services/balance/balanceService';
import { WalletDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const enum RewardsDestination {
  RESTAKE,
  TRANSFERABLE,
}

const getDropdownPayload = (wallet: WalletDS): DropdownOption<AccountID> => {
  const address = wallet.mainAccounts[0]?.accountId || wallet.chainAccounts[0]?.accountId;

  return {
    id: address,
    value: address,
    element: (
      <>
        <Identicon address={address} size={34} background={false} noCopy />
        <p className="text-left text-neutral text-lg font-semibold leading-5">{wallet.name}</p>
      </>
    ),
  };
};

type BondForm = {
  amount: string;
  destination: AccountID;
  // destination: Payee;
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
  const { getWallets, getWalletsByIds } = useWallet();

  // const [balances, setBalances] = useState<string[]>([]);

  const [wallets, setWallets] = useState<DropdownOption<AccountID>[]>([]);
  const [activeWallets, setActiveWallets] = useState<ResultOption<AccountID>[]>([]);

  const [activeRadio, setActiveRadio] = useState<ResultOption<RewardsDestination>>();

  const [payoutWallets, setPayoutWallets] = useState<DropdownOption<AccountID>[]>([]);
  const [activePayoutWallet, setActivePayoutWallet] = useState<ResultOption<AccountID>>();

  // useEffect(() => {
  //   if (!api || asset) return;
  //
  //   (async () => {
  //     const balance = await getBalance(toPublicKey(currentAddress) || '0x', asset.assetId.toString());
  //
  //     setBalance(balance ? transferable(balance) : '0');
  //   })();
  // }, [api]);

  useEffect(() => {
    (async () => {
      const wallets = await getWalletsByIds(walletsIds);
      const formattedWallets = wallets.map(getDropdownPayload);

      setWallets(formattedWallets);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const wallets = await getWallets({ type: WalletType.PARITY });

      const formattedWallets = wallets
        .filter((wallet) => wallet.mainAccounts[0] || wallet.chainAccounts[0]?.chainId !== chainId)
        .map(getDropdownPayload);

      setPayoutWallets(formattedWallets);
    })();
  }, []);

  const {
    handleSubmit,
    control,
    // formState: { isValid },
  } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  if (!asset) {
    return <div>LOADING</div>;
  }

  const initBond: SubmitHandler<BondForm> = ({ amount, destination }) => {
    console.log(amount, destination);
  };

  const getDestinations = (): RadioOption<number>[] => {
    const setElement = (label: string, amount: string, apy: number): ReactNode => (
      <div className="grid grid-cols-2 items-center">
        <p className="text-neutral text-lg leading-5 font-semibold">{label}</p>
        <p className="row-span-2 text-shade-30 text-lg leading-5 font-semibold text-right">{amount} DOT</p>
        <p className="text-success text-xs">{apy}% APY</p>
      </div>
    );

    return [
      {
        id: '1',
        value: RewardsDestination.RESTAKE,
        element: setElement('Restake rewards', '12.25', 16.04),
      },
      {
        id: '2',
        value: RewardsDestination.TRANSFERABLE,
        element: setElement('Transferable rewards', '12.01', 15.57),
      },
    ];
  };

  const onChangeDestination = (option: ResultOption) => {
    setActiveRadio(option);
  };

  return (
    <div className="w-[600px] flex flex-col items-center m-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          placeholder="Select accounts"
          summary="Multiple Accounts"
          activeIds={activeWallets.map((w) => w.id)}
          options={wallets}
          onChange={setActiveWallets}
        />
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
              <Amount
                value={value}
                name="amount"
                balance={'1'}
                asset={asset}
                invalid={Boolean(error)}
                onChange={onChange}
              />
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
          <RadioGroup
            activeId={activeRadio?.id}
            options={getDestinations()}
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
            onChange={onChangeDestination}
          />
        </div>
        {activeRadio?.value === RewardsDestination.TRANSFERABLE && (
          <Controller
            name="destination"
            control={control}
            render={({ field: { onChange } }) => (
              <Dropdown
                label="Payout account"
                placeholder="Select a payout account"
                activeId={activePayoutWallet?.id}
                options={payoutWallets}
                onChange={(option) => {
                  setActivePayoutWallet(option);
                  onChange(option.value);
                }}
              />
            )}
          />
        )}
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
      {/*<Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>*/}
      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg">
        Continue
      </Button>
    </div>
  );
};

export default InitBond;
