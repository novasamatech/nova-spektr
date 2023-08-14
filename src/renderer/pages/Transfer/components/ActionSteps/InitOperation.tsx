import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useAccount, Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { Explorer } from '@renderer/entities/chain';
import { Asset, useBalance } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { TransferForm } from '../TransferForm';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/InitOperation';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onAccountChange: (account: Account | MultisigAccount) => void;
  onSignatoryChange: (account: Account) => void;
  onResult: (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => void;
};

const InitOperation = ({
  api,
  chainId,
  network,
  asset,
  nativeToken,
  addressPrefix,
  onResult,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const { getActiveAccounts } = useAccount();
  const { getLiveAssetBalances } = useBalance();

  const accounts = getActiveAccounts();

  const [fee, setFee] = useState<string>('0');
  const [feeIsLoading, setFeeIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>('0');
  const [deposit, setDeposit] = useState<string>('0');
  const [tx, setTx] = useState<Transaction>();

  const [activeAccount, setActiveAccount] = useState<Account | MultisigAccount>();

  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset?.assetId.toString() || '');
  const nativeBalances = getLiveAssetBalances(accountIds, chainId, nativeToken?.assetId.toString() || '');

  const accountIsMultisig = activeAccount && isMultisig(activeAccount);
  const signatoryIds = accountIsMultisig ? (activeAccount as MultisigAccount).signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(
    signatoryIds,
    chainId,
    nativeToken?.assetId.toString() || asset?.assetId.toString() || '',
  );

  useEffect(() => {
    if (!isMultisig(activeAccount)) {
      setDeposit('0');
    }
  }, [activeAccount]);

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);
    const nativeBalance = nativeBalances.find((b) => b.accountId === account.accountId);

    return getAccountOption(account, { addressPrefix, asset, amount, balance, nativeBalance, fee, deposit });
  };

  const getSignatoryDrowdownOption = (account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(account, { addressPrefix, asset: nativeToken || asset, balance, fee, deposit });
  };

  const changeAccount = (account: Account | MultisigAccount) => {
    onAccountChange(account);
    setActiveAccount(account);
  };

  const changeSignatory = (account: Account | MultisigAccount) => {
    onSignatoryChange(account);
    setActiveSignatory(account);
  };

  return (
    <div className="flex flex-col gap-y-4">
      <TransferForm
        api={api}
        chainId={chainId}
        network={network}
        account={activeAccount}
        signer={activeSignatory}
        asset={asset}
        nativeToken={nativeToken}
        addressPrefix={addressPrefix}
        fee={fee}
        deposit={deposit}
        feeIsLoading={feeIsLoading}
        header={
          <OperationHeader
            chainId={chainId}
            accounts={accounts}
            isMultiselect
            getSignatoryOption={getSignatoryDrowdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={changeSignatory}
            onAccountChange={changeAccount}
          />
        }
        footer={
          activeAccount &&
          tx && (
            <OperationFooter
              api={api}
              asset={asset}
              account={activeAccount}
              totalAccounts={1}
              transaction={tx}
              onFeeChange={setFee}
              onFeeLoading={setFeeIsLoading}
              onDepositChange={setDeposit}
            />
          )
        }
        onTxChange={setTx}
        onSubmit={onResult}
        onChangeAmount={setAmount}
      />
    </div>
  );
};

export default InitOperation;
