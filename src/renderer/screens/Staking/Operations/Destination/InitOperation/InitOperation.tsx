import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Fee } from '@renderer/components/common';
import { Select, Plate, Block } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Balance } from '@renderer/domain/balance';
import { Account } from '@renderer/domain/account';
import { toAccountId } from '@renderer/shared/utils/address';
import { getTotalAccounts, getStakeAccountOption } from '../../common/utils';
import { OperationForm } from '../../components';

export type DestinationResult = {
  accounts: Account[];
  destination: Address;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  addressPrefix: number;
  identifiers: string[];
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();

  const dbAccounts = getLiveAccounts();
  const wallets = getLiveWallets();
  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const [fee, setFee] = useState('');
  const [destination, setDestination] = useState('');

  const [destAccounts, setDestAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<Address>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<AccountId, Balance>>(new Map());

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

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
    if (destAccounts.length === 0) return;

    const activeAccounts = destAccounts.map(({ id, value }) => ({ id, value }));
    setActiveDestAccounts(activeAccounts);
  }, [destAccounts.length]);

  useEffect(() => {
    const newTransactions = activeDestAccounts.map(({ value }) => ({
      chainId,
      address: value,
      type: TransactionType.DESTINATION,
      args: { payee: destination ? { Account: destination } : 'Staked' },
    }));

    setTransactions(newTransactions);
  }, [activeDestAccounts.length, destination]);

  const submitDestination = (data: { destination?: string }) => {
    const selectedAddresses = activeDestAccounts.map((stake) => toAccountId(stake.value));
    const accounts = totalAccounts.filter((account) => selectedAddresses.includes(account.accountId));

    onResult({
      accounts,
      destination: data.destination || '',
    });
  };

  return (
    <Plate as="section" className="w-[600px] mx-auto">
      <Block className="p-5 mb-2.5">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeDestAccounts.map((acc) => acc.id)}
          options={destAccounts}
          onChange={setActiveDestAccounts}
        />
      </Block>

      <OperationForm
        chainId={chainId}
        addressPrefix={addressPrefix}
        fields={['destination']}
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
