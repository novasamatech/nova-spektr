import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { isAddress } from '@polkadot/util-crypto';

import { Fee } from '@renderer/components/common';
import {
  Address,
  Balance,
  Button,
  Combobox,
  Icon,
  Identicon,
  InputHint,
  RadioGroup,
  Select,
} from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { RadioOption, RadioResult } from '@renderer/components/ui/RadioGroup/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId, PublicKey, SigningType } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Wallet } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const validateBalance = (balance: BalanceDS | string, amount: string, asset: Asset, fee?: string): boolean => {
  const stakeableBalance = typeof balance === 'string' ? balance : stakeableAmount(balance);

  let formatedAmount = new BN(formatAmount(amount, asset.precision));

  if (fee) {
    formatedAmount = formatedAmount.add(new BN(fee));
  }

  return formatedAmount.lte(new BN(stakeableBalance));
};

const validateBalanceForFee = (balance: BalanceDS | string, fee: string, amount: string, asset: Asset): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance)) && validateBalance(balance, amount, asset, fee);
};

const getDropdownPayload = (
  account: AccountDS,
  wallet?: Wallet,
  balance?: BalanceDS,
  asset?: Asset,
  fee?: string,
  amount?: string,
): DropdownOption<AccountID> => {
  const address = account.accountId || '';
  const publicKey = account.publicKey || '';
  const balanceExists = balance && asset && fee && amount;

  const balanceIsAvailable =
    !balanceExists || (validateBalanceForFee(balance, fee, amount, asset) && validateBalance(balance, amount, asset));

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <Address
          address={address}
          name={account.name}
          subName={wallet?.name}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceExists && (
        <div className="flex items-center gap-x-1">
          {!balanceIsAvailable && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(!balanceIsAvailable && 'text-error')}
            value={stakeableAmount(balance)}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      )}
    </div>
  );

  return {
    id: publicKey,
    value: address,
    element,
  };
};

type BondForm = {
  destination: AccountID;
};

export type DestinationResult = {
  accounts: AccountDS[];
  destination: AccountID;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accountIds: string[];
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, accountIds, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getTransactionFee } = useTransaction();

  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [destAccounts, setDestAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<AccountID>[]>([]);

  const [destinations, setDestinations] = useState<RadioOption<number>[]>([]);
  const [activeDestination, setActiveDestination] = useState<RadioResult<RewardsDestination>>();

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<AccountID>[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, BalanceDS>>(new Map());

  const availableStakeAccounts = dbAccounts.filter((account) => {
    return account.id && accountIds.includes(account.id.toString());
  });

  const publicKeys = availableStakeAccounts.reduce<PublicKey[]>((acc, account) => {
    if (account.publicKey) {
      acc.push(account.publicKey);
    }

    return acc;
  }, []);

  const balances = getLiveAssetBalances(publicKeys, chainId, asset.assetId.toString());

  const { handleSubmit, control, watch, unregister, register } = useForm<BondForm>({
    mode: 'onChange',
    defaultValues: { destination: '' },
  });

  const destination = watch('destination');
  const isTransferable = activeDestination?.value === RewardsDestination.TRANSFERABLE;
  const isRestake = activeDestination?.value === RewardsDestination.RESTAKE;
  const isValid = activeDestAccounts.length > 0 && ((isTransferable && destination) || isRestake);

  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.publicKey, balance]));

    setBalancesMap(newBalancesMap);
  }, [activeDestAccounts.length, balances]);

  // Init destinations
  useEffect(() => {
    const options = [
      { value: RewardsDestination.RESTAKE, element: t('staking.bond.restakeRewards') },
      { value: RewardsDestination.TRANSFERABLE, element: t('staking.bond.transferableRewards') },
    ];

    const formattedDestinations = options.map((dest, index) => ({
      id: index.toString(),
      value: dest.value,
      element: (
        <div className="grid grid-cols-2 items-center flex-1">
          <p className="text-neutral text-lg leading-5 font-semibold">{dest.element}</p>
        </div>
      ),
    }));

    setDestinations(formattedDestinations);
  }, []);

  // Init stake accounts
  useEffect(() => {
    const formattedAccounts = availableStakeAccounts.map((account) => {
      const matchBalance = balancesMap.get(account.publicKey || '0x');
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

      return getDropdownPayload(account, wallet, matchBalance, asset, fee);
    });

    setDestAccounts(formattedAccounts);
  }, [accountIds.length, fee, balancesMap]);

  // Init active stake accounts
  useEffect(() => {
    if (destAccounts.length === 0) return;

    const activeAccounts = destAccounts.map(({ id, value }) => ({ id, value }));
    setActiveDestAccounts(activeAccounts);
  }, [destAccounts.length]);

  // Init payout wallets
  useEffect(() => {
    const payoutAccounts = dbAccounts.reduce<DropdownOption<AccountID>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

        acc.push(getDropdownPayload(account, wallet));
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [dbAccounts.length]);

  // Setup transactions
  useEffect(() => {
    const transferableDestination = activeDestination?.value === RewardsDestination.TRANSFERABLE && destination;

    const newTransactions = activeDestAccounts.map(({ value }) => {
      return {
        chainId,
        address: value,
        type: TransactionType.DESTINATION,
        args: {
          // controller: address,
          payee: transferableDestination ? { Account: destination } : 'Staked',
        },
      };
    });

    setTransactions(newTransactions);
  }, [activeDestination, destination]);

  useEffect(() => {
    if (!transactions.length) return;

    getTransactionFee(transactions[0], api).then(setFee);
  }, [transactions]);

  // Unregister destination field if active radio is restake
  useEffect(() => {
    if (activeDestination?.value === RewardsDestination.RESTAKE) {
      unregister('destination');
    } else {
      register('destination');
    }
  }, [activeDestination?.value]);

  const submitBond: SubmitHandler<BondForm> = ({ destination }) => {
    const selectedAddresses = activeDestAccounts.map((stake) => stake.value);
    const accounts = availableStakeAccounts.filter(
      (account) => account.accountId && selectedAddresses.includes(account.accountId),
    );

    const transferableDestination = activeDestination?.value === RewardsDestination.RESTAKE ? '' : destination;

    onResult({
      destination: transferableDestination,
      accounts: accounts,
    });
  };

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeDestAccounts.map((acc) => acc.id)}
          options={destAccounts}
          onChange={setActiveDestAccounts}
        />
      </div>

      <form
        id="initBondForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitBond)}
      >
        <div className="grid grid-cols-2">
          <p className="text-neutral text-xs uppercase font-bold">{t('staking.bond.rewardsDestinationTitle')}</p>
          <a
            className="flex items-center gap-x-1 justify-self-end text-primary w-max"
            href={PAYOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="info" size={14} />
            <span className="underline text-xs">{t('staking.bond.aboutRewards')}</span>
          </a>
          <RadioGroup
            activeId={activeDestination?.id}
            options={destinations}
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
            onChange={setActiveDestination}
          />
        </div>
        {activeDestination?.value === RewardsDestination.TRANSFERABLE && (
          <Controller
            name="destination"
            control={control}
            rules={{
              required: true,
              validate: {
                isAddress: (v) => isAddress(v),
              },
            }}
            render={({ field: { onChange }, fieldState: { error } }) => (
              <>
                <Combobox
                  variant="up"
                  label={t('staking.bond.payoutAccountLabel')}
                  placeholder={t('staking.bond.payoutAccountPlaceholder')}
                  options={payoutAccounts}
                  invalid={Boolean(error)}
                  suffixElement={
                    destination && (
                      <Button variant="text" pallet="dark" weight="xs" onClick={() => onChange(undefined)}>
                        <Icon name="clearOutline" size={20} />
                      </Button>
                    )
                  }
                  prefixElement={<Identicon address={destination} size={24} background={false} canCopy={false} />}
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
        )}

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.bond.networkFee', { count: activeDestAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>
      </form>

      <Button type="submit" form="initBondForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
