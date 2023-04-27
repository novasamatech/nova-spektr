import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee } from '@renderer/components/common';
import { Plate, Select, Block } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount } from '@renderer/shared/utils/balance';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Account } from '@renderer/domain/account';
import { toAccountId } from '@renderer/shared/utils/address';
import { nonNullable } from '@renderer/shared/utils/functions';
import { getStakeAccountOption, validateBalanceForFee, validateStake, getTotalAccounts } from '../../common/utils';
import { OperationForm } from '../../components';

export type BondResult = {
  stake: string;
  accounts: Account[];
  destination: Address;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  identifiers: string[];
  asset: Asset;
  addressPrefix: number;
  onResult: (data: BondResult) => void;
};

const InitOperation = ({ api, chainId, identifiers, asset, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getMaxValidators } = useValidators();

  const dbAccounts = getLiveAccounts();
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');

  const [balanceRange, setBalanceRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeAccounts, setStakeAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeStakeAccounts, setActiveStakeAccounts] = useState<DropdownResult<Address>[]>([]);

  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);
  // const [activeSignatory, setActiveSignatory] = useState<DropdownResult<MultisigAccount>>();
  // const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<MultisigAccount>[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeAccounts.length, balances]);

  // Set balance range
  useEffect(() => {
    if (!activeBalances.length) return;

    const stakeableBalance = activeBalances.map(stakeableAmount);
    const minMaxBalances = stakeableBalance.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [stakeableBalance[0], stakeableBalance[0]],
    );

    setBalanceRange(minMaxBalances);
  }, [activeBalances]);

  // useEffect(() => {
  //   if (!activeStakeAccounts[0] || !isMultisig(activeStakeAccounts[0].value)) {
  //     setActiveSignatory(undefined);
  //     setSignatoryOptions([]);
  //   } else {
  //     const signatories = activeStakeAccounts[0].value.signatories.map((s) => s.accountId);
  //     const signers = dbAccounts.filter((a) => signatories.includes(a.accountId)) as MultisigAccount[];
  //
  //     const options = getAccountsOptions<MultisigAccount>(chainId, signers, addressPrefix);
  //
  //     if (options.length === 0) return;
  //
  //     setSignatoryOptions(options);
  //     setActiveSignatory({ id: options[0].id, value: options[0].value });
  //   }
  // }, [activeStakeAccounts.length, dbAccounts]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;
      const walletName = wallet?.name || '';

      return getStakeAccountOption(account, { asset, fee, amount, balance, walletName, addressPrefix });
    });

    if (formattedAccounts.length === 0) return;

    setStakeAccounts(formattedAccounts);
  }, [totalAccounts.length, amount, fee, activeBalances]);

  useEffect(() => {
    if (stakeAccounts.length === 0) return;

    const activeAccounts = stakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveStakeAccounts(activeAccounts);
  }, [stakeAccounts.length]);

  useEffect(() => {
    const maxValidators = getMaxValidators(api);

    const newTransactions = activeStakeAccounts.map(({ value }) => {
      const bondTx = {
        chainId,
        address: value,
        type: TransactionType.BOND,
        args: {
          value: formatAmount(amount, asset.precision),
          controller: value,
          payee: destination ? { Account: destination } : 'Staked',
        },
      };

      const nominateTx = {
        chainId,
        address: value,
        type: TransactionType.NOMINATE,
        args: { targets: Array(maxValidators).fill(value) },
      };

      return {
        chainId,
        address: value,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(newTransactions);
  }, [activeStakeAccounts.length, amount, destination]);

  const submitBond = (data: { amount: string; destination?: string }) => {
    const selectedAccountIds = activeStakeAccounts.map((stake) => toAccountId(stake.value));
    const accounts = totalAccounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts,
      stake: formatAmount(data.amount, asset.precision),
      destination: data.destination || '',
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeBalances.every((b) => validateStake(b, amount, asset.precision));
  };

  const validateFee = (amount: string): boolean => {
    const feeIsValid = activeBalances.every((b) => validateBalanceForFee(b, fee));
    const balanceIsValid = activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));

    return feeIsValid && balanceIsValid;
  };

  return (
    <Plate as="section" className="w-[600px] mx-auto">
      {/*<Block className="flex flex-col gap-y-2 p-5">*/}
      {/*  {stakeAccounts.length > 1 ? (*/}
      {/*    <Select*/}
      {/*      weight="lg"*/}
      {/*      placeholder={t('staking.bond.selectStakeAccountLabel')}*/}
      {/*      summary={t('staking.bond.selectStakeAccountSummary')}*/}
      {/*      activeIds={activeStakeAccounts.map((acc) => acc.id)}*/}
      {/*      options={stakeAccounts}*/}
      {/*      onChange={setActiveStakeAccounts}*/}
      {/*    />*/}
      {/*  ) : (*/}
      {/*    <ActiveAddress*/}
      {/*      address={activeStakeAccounts[0]?.value.accountId}*/}
      {/*      accountName={activeStakeAccounts[0]?.value.name}*/}
      {/*      signingType={activeStakeAccounts[0]?.value.signingType}*/}
      {/*      explorers={explorers}*/}
      {/*      addressPrefix={addressPrefix}*/}
      {/*    />*/}
      {/*  )}*/}

      {/*  {isMultisig(totalAccounts[0]) &&*/}
      {/*    (signatoryOptions.length > 1 ? (*/}
      {/*      <Dropdown*/}
      {/*        weight="lg"*/}
      {/*        placeholder="Select signer"*/}
      {/*        activeId={activeSignatory?.id}*/}
      {/*        options={signatoryOptions}*/}
      {/*        onChange={setActiveSignatory}*/}
      {/*      />*/}
      {/*    ) : (*/}
      {/*      <ActiveAddress*/}
      {/*        address={signatoryOptions[0].value.accountId}*/}
      {/*        accountName={signatoryOptions[0].value.name}*/}
      {/*        signingType={SigningType.PARITY_SIGNER}*/}
      {/*        explorers={explorers}*/}
      {/*        addressPrefix={addressPrefix}*/}
      {/*      />*/}
      {/*    ))}*/}
      {/*</Block>*/}

      <Block className="p-5 mb-2.5">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeStakeAccounts.map((acc) => acc.id)}
          options={stakeAccounts}
          onChange={setActiveStakeAccounts}
        />
      </Block>

      <OperationForm
        chainId={chainId}
        canSubmit={activeStakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={['amount', 'destination']}
        asset={asset}
        balanceRange={balanceRange}
        validateBalance={validateBalance}
        validateFee={validateFee}
        onSubmit={submitBond}
        onFormChange={({ amount, destination = '' }) => {
          setAmount(amount);
          setDestination(destination);
        }}
      >
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.bond.networkFee', { count: activeStakeAccounts.length })}</p>

          <Fee
            className="text-neutral font-semibold"
            api={api}
            asset={asset}
            transaction={transactions[0]}
            onFeeChange={setFee}
          />
        </div>
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
