import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee, ActiveAddress } from '@renderer/components/common';
import { HintList, Select, Block, Plate, Dropdown } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance, Balance as AccountBalance } from '@renderer/domain/balance';
import { ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, stakeableAmount } from '@renderer/shared/utils/balance';
import { AccountDS } from '@renderer/services/storage';
import { nonNullable } from '@renderer/shared/utils/functions';
import {
  getStakeAccountOption,
  getTotalAccounts,
  validateBalanceForFee,
  validateStake,
  getSignatoryOptions,
} from '../../common/utils';
import { OperationForm } from '../../components';
import { toAddress } from '@renderer/shared/utils/address';
import { Account, isMultisig } from '@renderer/domain/account';
import { Explorer } from '@renderer/domain/chain';

export type StakeMoreResult = {
  accounts: AccountDS[];
  amount: string;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  addressPrefix: number;
  explorers?: Explorer[];
  identifiers: string[];
  asset: Asset;
  onResult: (stakeMore: StakeMoreResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, explorers, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');

  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stakeMoreAccounts, setStakeMoreAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeStakeMoreAccounts, setActiveStakeMoreAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [activeBalances, setActiveBalances] = useState<Balance[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const firstAccount = activeStakeMoreAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? ['amount', 'description'] : ['amount'];

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

    setStakedRange(minMaxBalances);
  }, [activeBalances]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeStakeMoreAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeStakeMoreAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);

      return getStakeAccountOption(account, { balance, asset, fee, addressPrefix, amount });
    });

    setStakeMoreAccounts(formattedAccounts);
  }, [totalAccounts.length, amount, fee, activeBalances]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signatories = firstAccount.signatories.map((s) => s.accountId);
    const signers = dbAccounts.filter((a) => signatories.includes(a.accountId));
    const options = getSignatoryOptions(signers, addressPrefix);

    if (options.length === 0) return;

    setSignatoryOptions(options);
    setActiveSignatory({ id: options[0].id, value: options[0].value });
  }, [firstAccount, accountIsMultisig, dbAccounts]);

  useEffect(() => {
    if (stakeMoreAccounts.length === 0) return;

    const activeAccounts = stakeMoreAccounts.map(({ id, value }) => ({ id, value }));
    setActiveStakeMoreAccounts(activeAccounts);
  }, [stakeMoreAccounts.length]);

  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeStakeMoreAccounts.map(({ id }) => {
      return {
        chainId,
        type: TransactionType.STAKE_MORE,
        address: toAddress(id, { prefix: addressPrefix }),
        args: { maxAdditional: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  const submitStakeMore = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeStakeMoreAccounts.map((stake) => stake.id);
    const accounts = totalAccounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts,
      amount: formatAmount(data.amount, asset.precision),
      ...(accountIsMultisig && {
        description: data.description,
        signer: activeSignatory?.value,
      }),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeBalances.every((b) => validateStake(b, amount, asset.precision));
  };

  const validateFee = (): boolean => {
    const feeIsValid = activeBalances.every((b) => validateBalanceForFee(b, fee));
    const balanceIsValid = activeBalances.every((b) => validateStake(b, amount, asset.precision, fee));

    return feeIsValid && balanceIsValid;
  };

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block className="flex flex-col gap-y-2 p-5">
        {stakeMoreAccounts.length > 1 ? (
          <Select
            weight="lg"
            placeholder={t('staking.bond.selectStakeAccountLabel')}
            summary={t('staking.bond.selectStakeAccountSummary')}
            activeIds={activeStakeMoreAccounts.map((acc) => acc.id)}
            options={stakeMoreAccounts}
            onChange={setActiveStakeMoreAccounts}
          />
        ) : (
          <ActiveAddress
            address={firstAccount?.accountId}
            accountName={firstAccount?.name}
            signingType={firstAccount?.signingType}
            explorers={explorers}
            addressPrefix={addressPrefix}
          />
        )}

        {accountIsMultisig &&
          (signatoryOptions.length > 1 ? (
            <Dropdown
              weight="lg"
              placeholder={t('general.input.signerLabel')}
              activeId={activeSignatory?.id}
              options={signatoryOptions}
              onChange={setActiveSignatory}
            />
          ) : (
            <ActiveAddress
              address={signatoryOptions[0]?.value.accountId}
              accountName={signatoryOptions[0]?.value.name}
              signingType={SigningType.PARITY_SIGNER}
              explorers={explorers}
              addressPrefix={addressPrefix}
            />
          ))}
      </Block>

      <OperationForm
        chainId={chainId}
        canSubmit={activeStakeMoreAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        balanceRange={stakedRange}
        validateBalance={validateBalance}
        validateFee={validateFee}
        onSubmit={submitStakeMore}
        onFormChange={({ amount }) => {
          setAmount(amount);
        }}
      >
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeStakeMoreAccounts.length })}</p>

          <Fee
            className="text-neutral font-semibold"
            api={api}
            asset={asset}
            transaction={transactions[0]}
            onFeeChange={setFee}
          />
        </div>

        <HintList>
          <HintList.Item>{t('staking.stakeMore.eraHint')}</HintList.Item>
        </HintList>
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
