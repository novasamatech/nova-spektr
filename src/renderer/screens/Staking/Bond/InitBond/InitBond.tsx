/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { ReactNode, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Fee } from '@renderer/components/common';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import Amount from '@renderer/components/common/Amount/Amount';
import { Button, Dropdown, Icon, Identicon, InputHint, RadioGroup, Select } from '@renderer/components/ui';
import { Option as DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { Option as RadioOption, ResultOption } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset, AssetType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { WalletType } from '@renderer/domain/wallet';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferable } from '@renderer/services/balance/common/utils';
import { BalanceDS, WalletDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';
import { getAssetId, toPublicKey, validateAddress } from '@renderer/utils/address';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const getTransactionType = (assetType: AssetType | undefined): TransactionType => {
  if (assetType === AssetType.STATEMINE) {
    return TransactionType.ASSET_TRANSFER;
  }

  if (assetType === AssetType.ORML) {
    return TransactionType.ORML_TRANSFER;
  }

  return TransactionType.TRANSFER;
};

const enum RewardsDestination {
  RESTAKE,
  TRANSFERABLE,
}

const getDropdownPayload = (wallet: WalletDS, asset: Asset): DropdownOption<AccountID> => {
  const address = wallet.mainAccounts[0]?.accountId || wallet.chainAccounts[0]?.accountId;
  const element = (
    <>
      <Identicon address={address} size={34} background={false} noCopy />
      <p className="text-left text-neutral text-lg font-semibold leading-5">{wallet.name}</p>
      {/*<Balance value={} precision={} />*/}
    </>
  );

  return {
    id: address,
    value: address,
    element,
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
  const { getBalance } = useBalance();
  const { getWallets, getWalletsByIds } = useWallet();
  const { getTransactionFee } = useTransaction();

  const [fee, setFee] = useState('');
  const [balances, setBalances] = useState<[string, string]>();
  const [transaction, setTransaction] = useState<Transaction>();

  // @ts-ignore
  const [stakeWallets, setStakeWallets] = useState<DropdownOption<AccountID>[]>([]);

  // @ts-ignore
  const [wallets, setWallets] = useState<WalletDS[]>([]);
  const [activeWallets, setActiveWallets] = useState<ResultOption<AccountID>[]>([]);

  const [activeRadio, setActiveRadio] = useState<ResultOption<RewardsDestination>>();

  const [payoutWallets, setPayoutWallets] = useState<DropdownOption<AccountID>[]>([]);
  const [activePayoutWallet, setActivePayoutWallet] = useState<ResultOption<AccountID>>();

  const {
    handleSubmit,
    control,
    watch,
    // formState: { isValid },
  } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  const amount = watch('amount');

  const setupBalances = async (wallets: WalletDS[], chainId: ChainId, asset: Asset) => {
    const requestBalances = wallets.reduce((acc, wallet) => {
      if (!wallet.mainAccounts[0] && wallet.chainAccounts[0]?.chainId !== chainId) return acc;

      const publicKey = toPublicKey(wallet.mainAccounts[0]?.accountId || wallet.chainAccounts[0]?.accountId);
      if (!publicKey) return acc;

      return acc.concat(getBalance(publicKey, chainId, getAssetId(asset)));
    }, [] as Promise<BalanceDS | undefined>[]);

    // @ts-ignore
    const allBalances = (await Promise.all(requestBalances)).filter(Boolean).map(transferable);
    const minMaxBalances = allBalances.reduce(
      (acc, balance) => {
        if (!balance) return acc;

        // @ts-ignore
        const value = transferable(balance);

        acc[0] = new BN(value).lt(new BN(acc[0])) ? value : acc[0];
        acc[1] = new BN(value).gt(new BN(acc[1])) ? value : acc[1];

        return acc;
      },
      // @ts-ignore
      [0, 0] as [string, string],
    );
    setBalances(minMaxBalances);
  };

  // set wallets selector
  useEffect(() => {
    if (!api || !chainId || !asset) return;

    (async () => {
      const wallets = await getWalletsByIds(walletsIds);

      setupBalances(wallets, chainId, asset);
    })();
  }, [api, chainId, asset]);

  // useEffect(() => {
  //   (async () => {
  //     const wallets = await getWalletsByIds(walletsIds);
  //     setWallets(wallets);
  //
  //     const formattedWallets = wallets.map(getDropdownPayload);
  //
  //     setStakeWallets(formattedWallets);
  //     setActiveWallets(formattedWallets.map(({ id, value }) => ({ id, value })));
  //   })();
  // }, []);

  // set payout dropdown

  // set TX

  // set TX fee

  useEffect(() => {
    (async () => {
      const wallets = await getWallets({ type: WalletType.PARITY });

      const formattedWallets = wallets
        .filter((wallet) => wallet.mainAccounts[0] || wallet.chainAccounts[0]?.chainId === chainId)
        // @ts-ignore
        .map(getDropdownPayload);

      setPayoutWallets(formattedWallets);
    })();
  }, []);

  useEffect(() => {
    if (!chainId || !asset || !balances) return;

    setTransaction({
      chainId,
      type: getTransactionType(asset.type),
      address: activeWallets[0].value,
      args: {
        value: formatAmount(amount, asset.precision),
        dest: activeWallets[0].value,
        asset: getAssetId(asset),
      },
    } as Transaction);
  }, [balances, amount, asset]);

  useEffect(() => {
    (async () => {
      if (!api || !amount || !validateAddress(transaction?.args.dest) || !transaction) return;

      setFee(await getTransactionFee(transaction, api));
    })();
  }, [amount]);

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

  const validateBalanceForFee = (amount: string): boolean => {
    if (!balances) return false;
    const currentFee = fee || '0';

    return new BN(currentFee).add(new BN(formatAmount(amount, asset.precision))).lte(new BN(balances[1]));
  };

  const validateBalance = (amount: string) => {
    if (!balances) return false;

    return new BN(formatAmount(amount, asset.precision)).lte(new BN(balances[1]));
  };

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          placeholder="Select accounts"
          summary="Multiple Accounts"
          activeIds={activeWallets.map((w) => w.id)}
          options={stakeWallets}
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
              insufficientBalance: validateBalance,
              insufficientBalanceForFee: validateBalanceForFee,
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <Amount
                value={value}
                name="amount"
                balance={balances}
                asset={asset}
                invalid={Boolean(error)}
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
            onChange={setActiveRadio}
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

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transaction} />
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
