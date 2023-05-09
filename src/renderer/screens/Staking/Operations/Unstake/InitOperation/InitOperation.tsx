import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';
import cn from 'classnames';

import { Fee, ActiveAddress, Deposit } from '@renderer/components/common';
import { Balance, Block, HintList, Plate, Select, Icon, Dropdown } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { StakingMap } from '@renderer/services/staking/common/types';
import { UnstakingDuration } from '../../../Overview/components';
import {
  getUnstakeAccountOption,
  getTotalAccounts,
  validateBalanceForFee,
  validateUnstake,
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
} from '../../common/utils';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { OperationForm } from '@renderer/screens/Staking/Operations/components';
import { isMultisig, Account } from '@renderer/domain/account';
import { Explorer } from '@renderer/domain/chain';
import { toAddress } from '@renderer/shared/utils/address';

export type UnstakeResult = {
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
  onResult: (unstake: UnstakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, explorers, staking, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');

  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());

  const firstAccount = activeUnstakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const staked = activeUnstakeAccounts.map((a) => staking[a.id]?.active || '0');
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
  }, [activeUnstakeAccounts.length, staking]);

  useEffect(() => {
    if (signerBalance) {
      const balance = transferableAmount(signerBalance);
      setTransferableRange([balance, balance]);
    } else if (activeUnstakeAccounts.length) {
      const balancesMap = new Map(activeBalances.map((b) => [b.accountId, b]));
      const transferable = activeUnstakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
      const minMaxTransferable = transferable.reduce<[string, string]>(
        (acc, balance) => {
          if (balance) {
            acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
            acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];
          }

          return acc;
        },
        [transferable?.[0], transferable?.[0]],
      );

      setTransferableRange(minMaxTransferable);
    }
  }, [activeUnstakeAccounts.length, signerBalance, activeBalances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);
      const address = toAddress(account.accountId, { prefix: addressPrefix });
      const stake = staking[address];

      return getUnstakeAccountOption(account, { balance, stake, asset, addressPrefix, fee, amount });
    });

    setUnstakeAccounts(formattedAccounts);
  }, [totalAccounts.length, staking, amount, fee, activeBalances]);

  useEffect(() => {
    if (unstakeAccounts.length === 0) return;

    const activeAccounts = unstakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveUnstakeAccounts(activeAccounts);
  }, [unstakeAccounts.length]);

  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeUnstakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: toAddress(value.accountId, { prefix: addressPrefix }),
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signatories = firstAccount.signatories.map((s) => s.accountId);
    const signers = dbAccounts.filter((a) => signatories.includes(a.accountId));
    const options = getSignatoryOptions(signers, addressPrefix);

    if (options.length === 0) return;

    setSignatoryOptions(options);
    setActiveSignatory({ id: options[0].id, value: options[0].value });
  }, [firstAccount, accountIsMultisig, dbAccounts]);

  const submitUnstake = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeUnstakeAccounts.map((stake) => stake.id);
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
    return activeUnstakeAccounts.every((a) => validateUnstake(staking[a.id] || '0', amount, asset.precision));
  };

  const validateFee = (): boolean => {
    return activeBalances.every((b) => validateBalanceForFee(b, fee));
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const transferable =
    transferableRange[0] === transferableRange[1] ? (
      <Balance value={transferableRange[0]} precision={asset.precision} />
    ) : (
      <>
        <Balance value={transferableRange[0]} precision={asset.precision} />
        &nbsp;{'-'}&nbsp;
        <Balance value={transferableRange[1]} precision={asset.precision} />
      </>
    );

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block className="flex flex-col gap-y-2 p-5">
        {unstakeAccounts.length > 1 ? (
          <Select
            weight="lg"
            placeholder={t('staking.bond.selectStakeAccountLabel')}
            summary={t('staking.bond.selectStakeAccountSummary')}
            activeIds={activeUnstakeAccounts.map((acc) => acc.id)}
            options={unstakeAccounts}
            onChange={setActiveUnstakeAccounts}
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
        canSubmit={activeUnstakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields}
        balanceRange={stakedRange}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitUnstake}
        onFormChange={({ amount }) => {
          setAmount(amount);
        }}
      >
        {(errorType) => {
          const hasFeeError = errorType === 'insufficientBalanceForFee';

          return (
            <>
              <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
                <p>{t('staking.unstake.transferable')}</p>

                <div className={cn('flex font-semibold', hasFeeError ? 'text-error' : 'text-neutral')}>
                  {hasFeeError && <Icon className="text-error mr-1" name="warnCutout" size={12} />}
                  {transferable}&nbsp;{asset.symbol}
                </div>
              </div>

              <div className="grid grid-flow-row grid-cols-2 items-center gap-y-5">
                <p className="uppercase text-neutral-variant text-2xs">
                  {t('staking.unstake.networkFee', { count: activeUnstakeAccounts.length })}
                </p>

                <Fee
                  className="text-neutral justify-self-end text-2xs font-semibold"
                  api={api}
                  asset={asset}
                  transaction={transactions[0]}
                  onFeeChange={setFee}
                />

                {accountIsMultisig && (
                  <>
                    <p className="uppercase text-neutral-variant text-2xs">{t('transfer.networkDeposit')}</p>
                    <Deposit
                      className="text-neutral justify-self-end text-2xs font-semibold"
                      api={api}
                      asset={asset}
                      threshold={firstAccount.threshold}
                      onDepositChange={setDeposit}
                    />
                  </>
                )}
              </div>

              <HintList>
                <HintList.Item>
                  {t('staking.unstake.durationHint')} {'('}
                  <UnstakingDuration className="ml-1" api={api} />
                  {')'}
                </HintList.Item>
                <HintList.Item>{t('staking.unstake.noRewardsHint')}</HintList.Item>
                <HintList.Item>{t('staking.unstake.redeemHint')}</HintList.Item>
              </HintList>
            </>
          );
        }}
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
