import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { isAddress } from '@polkadot/util-crypto';
import { TFunction } from 'react-i18next';

import { Fee } from '@renderer/components/common';
import {
  ChainAddress,
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
import { Address, ChainID, AccountID, SigningType } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferableAmount } from '@renderer/services/balance/common/utils';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useWallet } from '@renderer/services/wallet/walletService';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const validateBalanceForFee = (balance: BalanceDS | string, fee: string): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance));
};

const getDropdownPayload = (
  account: AccountDS,
  walletName?: string,
  asset?: Asset,
  balance?: BalanceDS,
  fee?: string,
): DropdownOption<Address> => {
  const address = account.accountId || '';
  const accountId = account.accountId || '';
  const balanceExists = balance && asset && fee;

  const balanceIsIncorrect = balanceExists && !validateBalanceForFee(balance, fee);

  const element = (
    <div className="flex justify-between items-center gap-x-2.5">
      <div className="flex gap-x-[5px] items-center">
        <ChainAddress
          accountId={address}
          name={account.name}
          subName={walletName}
          signType={account.signingType}
          size={30}
          canCopy={false}
        />
      </div>
      {balanceExists && (
        <div className="flex items-center gap-x-1">
          {balanceIsIncorrect && <Icon size={12} className="text-error" name="warnCutout" />}

          <Balance
            className={cn(balanceIsIncorrect && 'text-error')}
            value={transferableAmount(balance)}
            precision={asset.precision}
            symbol={asset.symbol}
          />
        </div>
      )}
    </div>
  );

  return {
    id: accountId,
    value: address,
    element,
  };
};

const getDestinations = (t: TFunction): RadioOption<RewardsDestination>[] => {
  const options = [
    { value: RewardsDestination.RESTAKE, element: t('staking.bond.restakeRewards') },
    { value: RewardsDestination.TRANSFERABLE, element: t('staking.bond.transferableRewards') },
  ];

  return options.map((dest, index) => ({
    id: index.toString(),
    value: dest.value,
    element: (
      <div className="grid grid-cols-2 items-center flex-1">
        <p className="text-neutral text-lg leading-5 font-semibold">{dest.element}</p>
      </div>
    ),
  }));
};

type DestinationForm = {
  destination: Address;
};

export type DestinationResult = {
  accounts: AccountDS[];
  destination: Address;
};

type Props = {
  api: ApiPromise;
  chainId: ChainID;
  identifiers: string[];
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getTransactionFee } = useTransaction();

  const destinations = getDestinations(t);
  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [destAccounts, setDestAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<Address>[]>([]);
  const [activeDestination, setActiveDestination] = useState<RadioResult<RewardsDestination>>(destinations[0]);

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<Address>[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, BalanceDS>>(new Map());

  const totalAccounts = dbAccounts.filter((account) => {
    return account.id && identifiers.includes(account.id.toString());
  });

  const accountIds = totalAccounts.reduce<AccountID[]>((acc, account) => {
    if (account.accountId) {
      acc.push(account.accountId);
    }

    return acc;
  }, []);

  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const { handleSubmit, control, watch, unregister, register } = useForm<DestinationForm>({
    mode: 'onChange',
    defaultValues: { destination: '' },
  });

  const destination = watch('destination');
  const isTransferable = activeDestination?.value === RewardsDestination.TRANSFERABLE;
  const isRestake = activeDestination?.value === RewardsDestination.RESTAKE;
  const isValid = activeDestAccounts.length > 0 && ((isTransferable && destination) || isRestake);

  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));

    setBalancesMap(newBalancesMap);
  }, [activeDestAccounts.length, balances]);

  // Init stake accounts
  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const matchBalance = balancesMap.get(account.accountId || '0x');
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

      return getDropdownPayload(account, wallet?.name, asset, matchBalance, fee);
    });

    setDestAccounts(formattedAccounts);
  }, [totalAccounts.length, fee, balancesMap]);

  // Init active stake accounts
  useEffect(() => {
    if (destAccounts.length === 0) return;

    const activeAccounts = destAccounts.map(({ id, value }) => ({ id, value }));
    setActiveDestAccounts(activeAccounts);
  }, [destAccounts.length]);

  // Init payout wallets
  useEffect(() => {
    const payoutAccounts = dbAccounts.reduce<DropdownOption<Address>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;

        acc.push(getDropdownPayload(account, wallet?.name));
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
        args: { payee: transferableDestination ? { Account: destination } : 'Staked' },
      };
    });

    setTransactions(newTransactions);
  }, [activeDestAccounts.length, activeDestination]);

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

  const submitDestination: SubmitHandler<DestinationForm> = ({ destination }) => {
    const selectedAddresses = activeDestAccounts.map((stake) => stake.value);
    const accounts = totalAccounts.filter(
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
        id="initDestForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitDestination)}
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
            className="col-span-2"
            optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
            activeId={activeDestination?.id}
            options={destinations}
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

      <Button type="submit" form="initDestForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
