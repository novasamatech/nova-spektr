import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Transaction, TransactionType, OperationError } from '@entities/transaction';
import type { Account, Asset, Balance as AccountBalance, ChainId, AccountId, Wallet } from '@shared/core';
import { redeemableAmount, formatBalance, nonNullable, toAddress } from '@shared/lib/utils';
import { StakingMap, useStakingData, useEra } from '@entities/staking';
import { OperationFooter, OperationHeader } from '@features/operation';
import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { OperationForm } from '../../components';
import {
  getSignatoryOption,
  validateBalanceForFee,
  validateBalanceForFeeDeposit,
  getRedeemAccountOption,
} from '../../common/utils';
import { useAssetBalances } from '@entities/balance';

export type RedeemResult = {
  accounts: Account[];
  amounts: string[];
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: RedeemResult) => void;
};

const InitOperation = ({ api, chainId, accounts, addressPrefix, asset, onResult }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);

  const { subscribeStaking } = useStakingData();
  const { subscribeActiveEra } = useEra();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');
  const [redeemAmounts, setRedeemAmounts] = useState<string[]>([]);
  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});

  const [activeRedeemAccounts, setActiveRedeemAccounts] = useState<Account[]>([]);
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const totalRedeem = redeemAmounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const firstAccount = activeRedeemAccounts[0] || accounts[0];
  const redeemBalance = formatBalance(totalRedeem, asset.precision);
  const isMultisigWallet = walletUtils.isMultisig(activeWallet);
  const isMultisigAccount = firstAccount && accountUtils.isMultisigAccount(firstAccount);

  const formFields = isMultisigWallet
    ? [{ name: 'amount', value: redeemBalance.value, disabled: true }, { name: 'description' }]
    : [{ name: 'amount', value: redeemBalance.value, disabled: true }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const signatoryIds = isMultisigAccount ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = useAssetBalances({
    accountIds: signatoryIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

  useEffect(() => {
    if (accounts.length === 0) return;

    setActiveRedeemAccounts(accounts);
  }, [accounts.length]);

  useEffect(() => {
    const addresses = activeRedeemAccounts.map((stake) => toAddress(stake.accountId, { prefix: addressPrefix }));

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;
    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(chainId, api, addresses, setStaking);
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [api, activeRedeemAccounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeRedeemAccounts
      .map((a) => balancesMap.get(a.accountId as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeRedeemAccounts.length, balances]);

  useEffect(() => {
    if (!era) return;

    const amounts = activeRedeemAccounts.map((account) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });

      return redeemableAmount(staking[address]?.unlocking, era);
    });

    setRedeemAmounts(amounts);
  }, [activeRedeemAccounts.length, staking, era]);

  useEffect(() => {
    const newTransactions = activeRedeemAccounts.map((account) => {
      return {
        chainId,
        address: toAddress(account.accountId, { prefix: addressPrefix }),
        type: TransactionType.REDEEM,
        args: { numSlashingSpans: 1 },
      };
    });

    setTransactions(newTransactions);
  }, [activeRedeemAccounts.length]);

  const getAccountDropdownOption = (account: Account) => {
    const address = toAddress(account.accountId, { prefix: addressPrefix });
    const stake = staking[address];

    return getRedeemAccountOption(account, { asset, addressPrefix, stake, era });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { balance, asset, addressPrefix, fee, deposit });
  };

  const submitRedeem = (data: { description?: string }) => {
    const {
      value: formattedValue,
      decimalPlaces,
      suffix,
    } = formatBalance(
      redeemAmounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString(),
      asset.precision,
    );

    const redeemAmountFormatted = t('assetBalance.numberWithSuffix', {
      value: formattedValue,
      maximumFractionDigits: decimalPlaces,
      suffix,
    });

    onResult({
      amounts: redeemAmounts,
      accounts: activeRedeemAccounts.map((activeOption) => activeOption),
      ...(isMultisigWallet && {
        description:
          data.description || t('transactionMessage.redeem', { amount: redeemAmountFormatted, asset: asset.symbol }),
        signer: activeSignatory,
      }),
    });
  };

  const validateFee = (): boolean => {
    if (!isMultisigWallet) {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
    }

    if (!signerBalance) return false;

    return validateBalanceForFee(signerBalance, fee);
  };

  const validateDeposit = (): boolean => {
    if (!isMultisigWallet) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const getActiveAccounts = (): AccountId[] => {
    if (!isMultisigWallet) return activeRedeemAccounts.map((acc) => acc.accountId as AccountId);

    return activeSignatory ? [activeSignatory.accountId as AccountId] : [];
  };

  const canSubmit = !feeLoading && (activeRedeemAccounts.length > 0 || Boolean(activeSignatory));

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
      <OperationForm
        chainId={chainId}
        accounts={getActiveAccounts()}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        balanceRange={totalRedeem}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        header={({ invalidBalance, invalidFee, invalidDeposit }) => (
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            errors={invalidDeposit || invalidFee || invalidBalance ? [OperationError.EMPTY_ERROR] : undefined}
            getSignatoryOption={getSignatoryDropdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveRedeemAccounts}
          />
        )}
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeRedeemAccounts.length}
            feeTx={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        onSubmit={submitRedeem}
      />
    </div>
  );
};

export default InitOperation;
