import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee, ActiveAddress } from '@renderer/components/common';
import { Balance, HintList, Plate, Select, Block, Dropdown } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount, unlockingAmount } from '@renderer/shared/utils/balance';
import { StakingMap } from '@renderer/services/staking/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import {
  getRestakeAccountOption,
  validateRestake,
  validateBalanceForFee,
  getTotalAccounts,
  getSignatoryOptions,
} from '../../common/utils';
import { Account, isMultisig } from '@renderer/domain/account';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { OperationForm } from '../../components';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Explorer } from '@renderer/domain/chain';

export type RestakeResult = {
  accounts: Account[];
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
  staking: StakingMap;
  onResult: (unstake: RestakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, explorers, staking, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');

  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [restakeAccounts, setRestakeAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeRestakeAccounts, setActiveRestakeAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const firstAccount = activeRestakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? ['amount', 'description'] : ['amount'];

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeRestakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeRestakeAccounts.length, balances]);

  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const staked = activeRestakeAccounts.map((a) => unlockingAmount(staking[a.id]?.unlocking));
    const minMaxBalances = staked.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [staked[0], staked[0]],
    );

    setStakedRange(minMaxBalances);
  }, [activeRestakeAccounts.length, staking]);

  useEffect(() => {
    if (!activeRestakeAccounts.length) return;

    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const transferable = activeRestakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
    const minMaxTransferable = transferable.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [transferable?.[0], transferable?.[0]],
    );

    setTransferableRange(minMaxTransferable);
  }, [activeRestakeAccounts.length, activeBalances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);
      const stake = staking[account.accountId];

      return getRestakeAccountOption(account, { balance, stake, asset, fee, addressPrefix, amount });
    });

    setRestakeAccounts(formattedAccounts);
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
    if (restakeAccounts.length === 0) return;

    const activeAccounts = restakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveRestakeAccounts(activeAccounts);
  }, [restakeAccounts.length]);

  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeRestakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.RESTAKE,
        address: toAddress(value.accountId, { prefix: addressPrefix }),
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  const submitRestake = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeRestakeAccounts.map((stake) => stake.id);
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
    return activeRestakeAccounts.every((a) => validateRestake(staking[a.id] || '0', amount, asset.precision));
  };

  const validateFee = (): boolean => {
    return activeBalances.every((b) => validateBalanceForFee(b, fee));
  };

  const transferable =
    transferableRange[0] === transferableRange[1] ? (
      <Balance value={transferableRange[0]} precision={asset.precision} />
    ) : (
      <>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Balance value={transferableRange[0]} precision={asset.precision} /> -
        <Balance value={transferableRange[1]} precision={asset.precision} />
      </>
    );

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block className="flex flex-col gap-y-2 p-5">
        {restakeAccounts.length > 1 ? (
          <Select
            weight="lg"
            placeholder={t('staking.bond.selectStakeAccountLabel')}
            summary={t('staking.bond.selectStakeAccountSummary')}
            activeIds={activeRestakeAccounts.map((acc) => acc.id)}
            options={restakeAccounts}
            onChange={setActiveRestakeAccounts}
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
        canSubmit={activeRestakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields}
        balanceRange={stakedRange}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        onSubmit={submitRestake}
        onFormChange={({ amount }) => {
          setAmount(amount);
        }}
      >
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.transferable')}</p>

          <div className="flex text-neutral font-semibold">
            {transferable}&nbsp;{asset.symbol}
          </div>
        </div>

        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeRestakeAccounts.length })}</p>

          <Fee
            className="text-neutral font-semibold"
            api={api}
            asset={asset}
            transaction={transactions[0]}
            onFeeChange={setFee}
          />
        </div>

        <HintList>
          <HintList.Item>{t('staking.restake.eraHint')}</HintList.Item>
        </HintList>
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
