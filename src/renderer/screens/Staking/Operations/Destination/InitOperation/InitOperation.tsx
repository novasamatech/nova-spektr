import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Fee, ActiveAddress, Deposit } from '@renderer/components/common';
import { Select, Plate, Block, Dropdown } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { Account, isMultisig } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import {
  getTotalAccounts,
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
  validateBalanceForFee,
  getGeneralAccountOption,
} from '../../common/utils';
import { OperationForm } from '../../components';
import { Explorer } from '@renderer/domain/chain';
import { nonNullable } from '@renderer/shared/utils/functions';

export type DestinationResult = {
  accounts: Account[];
  destination: Address;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  explorers?: Explorer[];
  addressPrefix: number;
  identifiers: string[];
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, explorers, addressPrefix, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveBalance, getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();

  const dbAccounts = getLiveAccounts();
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [destination, setDestination] = useState('');

  const [destAccounts, setDestAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());
  const signerBalance = getLiveBalance(activeSignatory?.value.accountId || '0x0', chainId, asset.assetId.toString());

  const firstAccount = activeDestAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'destination' }, { name: 'description' }] : [{ name: 'destination' }];

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeDestAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeDestAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = activeBalances.find((b) => b.accountId === account.accountId);
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;
      const walletName = wallet?.name || '';

      return getGeneralAccountOption(account, { asset, fee, balance, addressPrefix, walletName });
    });

    setDestAccounts(formattedAccounts);
  }, [totalAccounts.length, fee, activeBalances]);

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
    if (destAccounts.length === 0) return;

    const activeAccounts = destAccounts.map(({ id, value }) => ({ id, value }));
    setActiveDestAccounts(activeAccounts);
  }, [destAccounts.length]);

  useEffect(() => {
    const newTransactions = activeDestAccounts.map(({ value }) => ({
      chainId,
      address: toAddress(value.accountId, { prefix: addressPrefix }),
      type: TransactionType.DESTINATION,
      args: { payee: destination ? { Account: destination } : 'Staked' },
    }));

    setTransactions(newTransactions);
  }, [activeDestAccounts.length, destination]);

  const submitDestination = (data: { destination?: string; description?: string }) => {
    const selectedAccountIds = activeDestAccounts.map((stake) => stake.id);
    const accounts = totalAccounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts,
      destination: data.destination || '',
      ...(accountIsMultisig && {
        description: data.description,
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

  return (
    <Plate as="section" className="w-[600px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block className="flex flex-col gap-y-2 p-5">
        {destAccounts.length > 1 ? (
          <Select
            weight="lg"
            placeholder={t('staking.bond.selectStakeAccountLabel')}
            summary={t('staking.bond.selectStakeAccountSummary')}
            activeIds={activeDestAccounts.map((acc) => acc.id)}
            options={destAccounts}
            onChange={setActiveDestAccounts}
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
        canSubmit={activeDestAccounts.length > 0}
        addressPrefix={addressPrefix}
        fields={formFields} //todo better to provide some types here
        asset={asset}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitDestination}
        onFormChange={({ destination = '' }) => {
          setDestination(destination);
        }}
      >
        <div className="grid grid-flow-row grid-cols-2 items-center gap-y-5">
          <p className="uppercase text-neutral-variant text-2xs">
            {t('staking.bond.networkFee', { count: activeDestAccounts.length })}
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
      </OperationForm>
    </Plate>
  );
};

export default InitOperation;
