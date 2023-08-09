import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Asset, Balance as AccountBalance, useBalance } from '@renderer/entities/asset';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/entities/transaction';
import { Account, isMultisig } from '@renderer/entities/account';
import { redeemableAmount, formatBalance, nonNullable, toAddress } from '@renderer/shared/lib/utils';
import { StakingMap, useStakingData, useEra } from '@renderer/entities/staking';
import { OperationForm } from '../../components';
import { validateBalanceForFee, validateBalanceForFeeDeposit, getRedeemAccountOption } from '../../common/utils';
import { getSignatoryOption } from '@renderer/pages/Transfer/common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/InitOperation';

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
  const { getLiveAssetBalances } = useBalance();
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

  const firstAccount = activeRedeemAccounts[0];
  const accountIsMultisig = isMultisig(firstAccount);
  const redeemBalance = formatBalance(totalRedeem, asset.precision);
  const formFields = accountIsMultisig
    ? [{ name: 'amount', value: redeemBalance.value, disabled: true }, { name: 'description' }]
    : [{ name: 'amount', value: redeemBalance.value, disabled: true }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.accountId);

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

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { balance, asset, addressPrefix, fee, deposit });
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
      ...(accountIsMultisig && {
        description:
          data.description || t('transactionMessage.redeem', { amount: redeemAmountFormatted, asset: asset.symbol }),
        signer: activeSignatory,
      }),
    });
  };

  const validateFee = (): boolean => {
    if (!accountIsMultisig) {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
    }

    if (!signerBalance) return false;

    return validateBalanceForFee(signerBalance, fee);
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const getActiveAccounts = (): AccountId[] => {
    if (!accountIsMultisig) return activeRedeemAccounts.map((acc) => acc.accountId as AccountId);

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
        footer={
          <OperationFooter
            api={api}
            asset={asset}
            account={firstAccount}
            totalAccounts={activeRedeemAccounts.length}
            transaction={transactions[0]}
            onFeeChange={setFee}
            onFeeLoading={setFeeLoading}
            onDepositChange={setDeposit}
          />
        }
        header={({ invalidBalance, invalidFee, invalidDeposit }) => (
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            invalid={accountIsMultisig ? invalidDeposit || invalidFee : invalidBalance || invalidFee}
            getSignatoryOption={getSignatoryDrowdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={setActiveSignatory}
            onAccountChange={setActiveRedeemAccounts}
          />
        )}
        onSubmit={submitRedeem}
      />
    </div>
  );
};

export default InitOperation;
