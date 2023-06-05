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
import { formatAmount, unlockingAmount } from '@renderer/shared/utils/balance';
import { StakingMap } from '@renderer/services/staking/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import { Account, isMultisig } from '@renderer/domain/account';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { OperationForm } from '../../components';
import { nonNullable } from '@renderer/shared/utils/functions';
import { FootnoteText, Select, MultiSelect } from '@renderer/components/ui-redesign';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import {
  getRestakeAccountOption,
  validateRestake,
  validateBalanceForFee,
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
} from '../../common/utils';

export type RestakeResult = {
  accounts: Account[];
  amount: string;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: RestakeResult) => void;
};

const InitOperation = ({ api, chainId, accounts, addressPrefix, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();
  const { subscribeStaking } = useStakingData();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [staking, setStaking] = useState<StakingMap>({});

  const [minBalance, setMinBalance] = useState<string>('0');
  // const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);

  const [restakeAccounts, setRestakeAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeRestakeAccounts, setActiveRestakeAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeRestakeAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'amount' }, { name: 'description' }] : [{ name: 'amount' }];

  const accountIds = accounts.map((account) => account.accountId);
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  useEffect(() => {
    const selectedAccountIds = activeRestakeAccounts.map((stake) => stake.id);
    const selectedAccounts = accounts.map((a) => a.accountId).filter((a) => selectedAccountIds.includes(a));

    let unsubStaking: () => void | undefined;
    (async () => {
      unsubStaking = await subscribeStaking(chainId, api, selectedAccounts, setStaking);
    })();

    return () => {
      unsubStaking?.();
    };
  }, [api, activeRestakeAccounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeRestakeAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeRestakeAccounts.length, balances]);

  useEffect(() => {
    // TODO: check signatory
    if (!Object.keys(staking).length) return;

    const stakedBalances = activeRestakeAccounts.map((a) => unlockingAmount(staking[a.id]?.unlocking));
    const minStakedBalance = stakedBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, stakedBalances[0]);

    setMinBalance(minStakedBalance);
  }, [activeRestakeAccounts.length, staking]);

  // useEffect(() => {
  //   // TODO: check signatory
  //   if (signerBalance) {
  //     const balance = transferableAmount(signerBalance);
  //     setTransferableRange([balance, balance]);
  //   } else if (activeRestakeAccounts.length) {
  //     const balancesMap = new Map(activeBalances.map((b) => [b.accountId, b]));
  //     const transferable = activeRestakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
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
  // }, [activeRestakeAccounts.length, signerBalance, activeBalances]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);
      const address = toAddress(account.accountId, { prefix: addressPrefix });
      const stake = staking[address];

      return getRestakeAccountOption(account, { balance, stake, asset, fee, addressPrefix, amount });
    });

    setRestakeAccounts(formattedAccounts);
  }, [amount, fee, balances]);

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
    if (restakeAccounts.length === 0) return;

    const activeAccounts = restakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveRestakeAccounts(activeAccounts);
  }, [restakeAccounts.length]);

  useEffect(() => {
    const newTransactions = activeRestakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.RESTAKE,
        address: toAddress(value.accountId, { prefix: addressPrefix }),
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [activeRestakeAccounts.length, amount]);

  const submitRestake = (data: { amount: string; description?: string }) => {
    const selectedAccountIds = activeRestakeAccounts.map((stake) => stake.id);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      amount: formatAmount(data.amount, asset.precision),
      ...(accountIsMultisig && {
        description: data.description || t('transactionMessage.restake', { amount: data.amount, asset: asset.symbol }),
        signer: activeSignatory?.value,
      }),
    });
  };

  const validateBalance = (amount: string): boolean => {
    return activeRestakeAccounts.every((a) => validateRestake(staking[a.id] || '0', amount, asset.precision));
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
  //       {/* eslint-disable-next-line i18next/no-literal-string */}
  //       <Balance value={transferableRange[0]} precision={asset.precision} /> -
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
          selectedIds={activeRestakeAccounts.map((acc) => acc.id)}
          options={restakeAccounts}
          onChange={setActiveRestakeAccounts}
        />
      )}

      <OperationForm
        chainId={chainId}
        canSubmit={activeRestakeAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields}
        balanceRange={['0', minBalance]}
        asset={asset}
        validateBalance={validateBalance}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitRestake}
        onAmountChange={setAmount}
      >
        {/*<div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">*/}
        {/*  <p>{t('staking.unstake.transferable')}</p>*/}

        {/*  <div className="flex text-neutral font-semibold">*/}
        {/*    {transferable}&nbsp;{asset.symbol}*/}
        {/*  </div>*/}
        {/*</div>*/}

        <div className="flex flex-col gap-y-2">
          {accountIsMultisig && (
            <div className="flex justify-between items-center gap-x-2">
              <div className="flex items-center gap-x-2">
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.bond.networkDepositLabel')}</FootnoteText>
              </div>
              <FootnoteText>
                <Deposit api={api} asset={asset} threshold={firstAccount.threshold} onDepositChange={setDeposit} />
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
      </OperationForm>
    </div>
  );
};

export default InitOperation;
