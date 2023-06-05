import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee, Deposit } from '@renderer/components/common';
import { Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount } from '@renderer/shared/utils/balance';
import { StakingMap } from '@renderer/services/staking/common/types';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { OperationForm } from '@renderer/screens/Staking/Operations/components';
import { isMultisig, Account } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { FootnoteText, Select, MultiSelect } from '@renderer/components/ui-redesign';
import {
  getUnstakeAccountOption,
  validateBalanceForFee,
  validateUnstake,
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
} from '../../common/utils';

export type UnstakeResult = {
  accounts: Account[];
  amount: string;
  signer?: Account;
  description?: string;
  withChill: boolean[];
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: UnstakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, accounts, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();
  const { subscribeStaking, getMinNominatorBond } = useStakingData();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [amount, setAmount] = useState('');
  const [staking, setStaking] = useState<StakingMap>({});

  const [minBalance, setMinBalance] = useState('0');
  const [minimumStake, setMinimumStake] = useState('0');
  // const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeUnstakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());

  useEffect(() => {
    getMinNominatorBond(api).then(setMinimumStake);
  }, [api]);

  useEffect(() => {
    const selectedAccountIds = activeUnstakeAccounts.map((stake) => stake.id);
    const selectedAccounts = accounts.map((a) => a.accountId).filter((a) => selectedAccountIds.includes(a));

    let unsubStaking: () => void | undefined;
    (async () => {
      unsubStaking = await subscribeStaking(chainId, api, selectedAccounts, setStaking);
    })();

    return () => {
      unsubStaking?.();
    };
  }, [api, activeUnstakeAccounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const stakedBalances = activeUnstakeAccounts.map((a) => staking[a.id]?.active || '0');
    const minStakedBalance = stakedBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, stakedBalances[0]);

    setMinBalance(minStakedBalance);
  }, [activeUnstakeAccounts.length, staking]);

  // useEffect(() => {
  //   if (signerBalance) {
  //     const balance = transferableAmount(signerBalance);
  //     setTransferableRange([balance, balance]);
  //   } else if (activeUnstakeAccounts.length) {
  //     const balancesMap = new Map(activeBalances.map((b) => [b.accountId, b]));
  //     const transferable = activeUnstakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
  //     const minMaxTransferable = transferable.reduce<[string, string]>(
  //       (acc, balance) => {
  //         if (balance) {
  //           acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
  //           acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];
  //         }
  //
  //         return acc;
  //       },
  //       [transferable?.[0], transferable?.[0]],
  //     );
  //
  //     setTransferableRange(minMaxTransferable);
  //   }
  // }, [activeUnstakeAccounts.length, signerBalance, activeBalances]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);
      const address = toAddress(account.accountId, { prefix: addressPrefix });
      const stake = staking[address];

      return getUnstakeAccountOption(account, { balance, stake, asset, addressPrefix, fee, amount });
    });

    setUnstakeAccounts(formattedAccounts);
  }, [staking, amount, fee, balances]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signatories = firstAccount.signatories.map((s) => s.accountId);
    const signers = dbAccounts.filter((a) => signatories.includes(a.accountId));
    const options = getSignatoryOptions(signers, addressPrefix);

    if (options.length === 0) return;

    setSignatoryOptions(options);
    setActiveSignatory({ id: options[0].id, value: options[0].value });
  }, [firstAccount, accountIsMultisig, dbAccounts.length]);

  useEffect(() => {
    if (unstakeAccounts.length === 0) return;

    const activeAccounts = unstakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveUnstakeAccounts(activeAccounts);
  }, [unstakeAccounts.length]);

  useEffect(() => {
    const newTransactions = activeUnstakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: toAddress(value.accountId, { prefix: addressPrefix }),
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [minBalance, amount]);

  const submitUnstake = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeUnstakeAccounts.map((stake) => stake.id);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));
    const withChill = selectedAccounts.map((a) => {
      const leftAmount = new BN(staking[a.accountId]?.active || 0).sub(new BN(amount));

      return leftAmount.lte(new BN(minimumStake));
    });

    onResult({
      withChill,
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.unstake', { amount: data.amount, asset: asset.symbol }),
        signer: activeSignatory?.value,
      }),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeUnstakeAccounts.every((a) => validateUnstake(staking[a.id] || '0', amount, asset.precision));
  };

  const validateFee = (): boolean => {
    if (accountIsMultisig) {
      if (!signerBalance) return false;

      return validateBalanceForFee(signerBalance, fee);
    } else {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
    }
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  // const transferable =
  //   transferableRange[0] === transferableRange[1] ? (
  //     <Balance value={transferableRange[0]} precision={asset.precision} />
  //   ) : (
  //     <>
  //       <Balance value={transferableRange[0]} precision={asset.precision} />
  //       &nbsp;{'-'}&nbsp;
  //       <Balance value={transferableRange[1]} precision={asset.precision} />
  //     </>
  //   );

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
      {accountIsMultisig ? (
        <Select
          label={t('staking.bond.signatoryLabel')}
          placeholder={t('staking.bond.signatoryPlaceholder')}
          selectedId={activeSignatory?.id}
          options={signatoryOptions}
          onChange={setActiveSignatory}
        />
      ) : (
        <MultiSelect
          label={t('staking.bond.accountLabel')}
          placeholder={t('staking.bond.accountPlaceholder')}
          multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
          selectedIds={activeUnstakeAccounts.map((acc) => acc.id)}
          options={unstakeAccounts}
          onChange={setActiveUnstakeAccounts}
        />
      )}

      <OperationForm
        chainId={chainId}
        canSubmit={activeUnstakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields} //todo fields prop has string array type. Maybe better to provide some types from form to avoid misspelling
        balanceRange={['0', minBalance]}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitUnstake}
        onAmountChange={setAmount}
      >
        {(errorType) => {
          // const hasFeeError = errorType === 'insufficientBalanceForFee';

          return (
            <>
              {/*<div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">*/}
              {/*  <p>{t('staking.unstake.transferable')}</p>*/}

              {/*  <div className={cn('flex font-semibold', hasFeeError ? 'text-error' : 'text-neutral')}>*/}
              {/*    {hasFeeError && <Icon className="text-error mr-1" name="warnCutout" size={12} />}*/}
              {/*    {transferable}&nbsp;{asset.symbol}*/}
              {/*  </div>*/}
              {/*</div>*/}

              <div className="flex flex-col gap-y-2">
                {accountIsMultisig && (
                  <div className="flex justify-between items-center gap-x-2">
                    <div className="flex items-center gap-x-2">
                      <Icon className="text-text-tertiary" name="lock" size={12} />
                      <FootnoteText className="text-text-tertiary">
                        {t('staking.bond.networkDepositLabel')}
                      </FootnoteText>
                    </div>
                    <FootnoteText>
                      <Deposit
                        api={api}
                        asset={asset}
                        threshold={firstAccount.threshold}
                        onDepositChange={setDeposit}
                      />
                    </FootnoteText>
                  </div>
                )}

                <div className="flex justify-between items-center gap-x-2">
                  <FootnoteText className="text-text-tertiary">{t('staking.bond.networkFeeLabel')}</FootnoteText>
                  <FootnoteText className="text-text-tertiary">
                    <Fee api={api} asset={asset} transaction={transactions[0]} onFeeChange={setFee} />
                  </FootnoteText>
                </div>
              </div>
            </>
          );
        }}
      </OperationForm>
    </div>
  );
};

export default InitOperation;
