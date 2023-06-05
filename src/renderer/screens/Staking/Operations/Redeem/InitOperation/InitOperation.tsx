import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Fee, Deposit } from '@renderer/components/common';
import { Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { redeemableAmount, formatBalance } from '@renderer/shared/utils/balance';
import { nonNullable } from '@renderer/shared/utils/functions';
import { toAddress } from '@renderer/shared/utils/address';
import { Account, isMultisig } from '@renderer/domain/account';
import { StakingMap } from '@renderer/services/staking/common/types';
import { MultiSelect, Select, FootnoteText } from '@renderer/components/ui-redesign';
import { OperationForm } from '../../components';
import {
  validateBalanceForFee,
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
  getRedeemAccountOption,
} from '../../common/utils';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { useEra } from '@renderer/services/staking/eraService';

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
  const { getLiveAccounts } = useAccount();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();
  const { subscribeStaking } = useStakingData();
  const { subscribeActiveEra } = useEra();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [redeemAmounts, setRedeemAmounts] = useState<string[]>([]);
  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});

  const [redeemAccounts, setRedeemAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeRedeemAccounts, setActiveRedeemAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  // const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const totalRedeem = redeemAmounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const firstAccount = activeRedeemAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const redeemBalance = formatBalance(totalRedeem, asset.precision);
  const formFields = accountIsMultisig
    ? [{ name: 'amount', value: redeemBalance.value, disabled: true }, { name: 'description' }]
    : [{ name: 'amount', value: redeemBalance.value, disabled: true }];

  const accountIds = accounts.map((account) => account.accountId);
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  useEffect(() => {
    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    (async () => {
      const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(chainId, api, addresses, setStaking);
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [api, accounts.length]);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeRedeemAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeRedeemAccounts.length, balances]);

  // useEffect(() => {
  //   // TODO: research what is this
  //   if (signerBalance) {
  //     const balance = transferableAmount(signerBalance);
  //     setTransferableRange([balance, balance]);
  //   } else if (activeRedeemAccounts.length) {
  //     const balancesMap = new Map(activeBalances.map((b) => [b.accountId, b]));
  //     const transferable = activeRedeemAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
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
  // }, [activeRedeemAccounts.length, signerBalance, activeBalances]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => {
      const address = toAddress(account.accountId, { prefix: addressPrefix });
      const stake = staking[address];

      return getRedeemAccountOption(account, { asset, addressPrefix, stake, era });
    });

    setRedeemAccounts(formattedAccounts);
  }, [staking, era]);

  useEffect(() => {
    if (!era) return;

    const amounts = activeRedeemAccounts.map(({ value }) => {
      const address = toAddress(value.accountId, { prefix: addressPrefix });

      return redeemableAmount(staking[address]?.unlocking, era);
    });

    setRedeemAmounts(amounts);
  }, [activeRedeemAccounts.length, staking, era]);

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
    if (redeemAccounts.length === 0) return;

    const activeAccounts = redeemAccounts.map(({ id, value }) => ({ id, value }));
    setActiveRedeemAccounts(activeAccounts);
  }, [redeemAccounts.length]);

  useEffect(() => {
    const newTransactions = activeRedeemAccounts.map(({ value }) => {
      return {
        chainId,
        address: toAddress(value.accountId, { prefix: addressPrefix }),
        type: TransactionType.REDEEM,
        args: { numSlashingSpans: 1 },
      };
    });

    setTransactions(newTransactions);
  }, [activeRedeemAccounts.length]);

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
      accounts: activeRedeemAccounts.map((activeOption) => activeOption.value),
      ...(accountIsMultisig && {
        description:
          data.description || t('transactionMessage.redeem', { amount: redeemAmountFormatted, asset: asset.symbol }),
        signer: activeSignatory?.value,
      }),
    });
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
  //     <BalanceNew value={transferableRange[0]} asset={asset} />
  //   ) : (
  //     <>
  //       <BalanceNew value={transferableRange[0]} asset={asset} />
  //       &nbsp;{'-'}&nbsp;
  //       <BalanceNew value={transferableRange[1]} asset={asset} />
  //     </>
  //   );

  const canSubmit = (Boolean(fee) && fee !== '0') || activeRedeemAccounts.length > 0 || Boolean(activeSignatory);

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
          selectedIds={activeRedeemAccounts.map((acc) => acc.id)}
          options={redeemAccounts}
          onChange={setActiveRedeemAccounts}
        />
      )}

      <OperationForm
        chainId={chainId}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitRedeem}
      >
        {(errorType) => {
          // const hasFeeError = ['insufficientBalanceForFee', 'insufficientBalanceForDeposit'].includes(errorType);

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
