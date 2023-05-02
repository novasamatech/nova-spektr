import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Fee, ActiveAddress } from '@renderer/components/common';
import { Select, Plate, Block, Dropdown } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Balance } from '@renderer/domain/balance';
import { Account, isMultisig } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { getTotalAccounts, getStakeAccountOption, getSignatoryOptions } from '../../common/utils';
import { OperationForm } from '../../components';
import { Explorer } from '@renderer/domain/chain';

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
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();

  const dbAccounts = getLiveAccounts();
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');
  const [destination, setDestination] = useState('');

  const [destAccounts, setDestAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<AccountId, Balance>>(new Map());

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const firstAccount = activeDestAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? ['destination', 'description'] : ['destination'];

  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));

    setBalancesMap(newBalancesMap);
  }, [activeDestAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = balancesMap.get(account.accountId);
      const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;
      const walletName = wallet?.name || '';

      return getStakeAccountOption(account, { asset, fee, balance, addressPrefix, walletName });
    });

    setDestAccounts(formattedAccounts);
  }, [totalAccounts.length, fee, balancesMap]);

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
        fields={formFields}
        asset={asset}
        onSubmit={submitDestination}
        onFormChange={({ destination = '' }) => {
          setDestination(destination);
        }}
      >
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.bond.networkFee', { count: activeDestAccounts.length })}</p>

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
