import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useAccount, Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { Explorer } from '@renderer/entities/chain';
import { Asset, AssetType, useBalance } from '@renderer/entities/asset';
import { Transaction, TransactionType, useExtrinsicService } from '@renderer/entities/transaction';
import { TransferForm, TransferFormData } from '../TransferForm';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { OperationFooterNew, OperationHeader } from '@renderer/features/operation';
import { getAssetId, TEST_ACCOUNT_ID, toAddress } from '@renderer/shared/lib/utils';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  getFee: () => Promise<string>;
  onTxChange: (transactions: Transaction[]) => void;
  onAccountChange: (account: Account | MultisigAccount) => void;
  onSignatoryChange: (account: Account) => void;
  onResult: (transferTx: Transaction, description?: string) => void;
};

export const InitOperation = ({
  api,
  chainId,
  network,
  asset,
  nativeToken,
  addressPrefix,
  onResult,
  getFee,
  onTxChange,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const { getActiveAccounts } = useAccount();
  const { getLiveAssetBalances } = useBalance();
  const { buildTransaction } = useExtrinsicService();

  const accounts = getActiveAccounts();

  const [fee, setFee] = useState<string>('0');
  const [feeIsLoading, setFeeIsLoading] = useState(false);
  const [deposit, setDeposit] = useState<string>('0');
  const [formData, setFormData] = useState<Partial<TransferFormData>>();

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

  const amount = formData?.amount || '0';

  useEffect(() => {
    setActiveAccount(accounts[0]);
    onAccountChange(accounts[0]);
  }, [accounts.length, accounts[0]?.accountId]);

  useEffect(() => {
    if (!isMultisig(activeAccount)) {
      setDeposit('0');
    }
  }, [activeAccount]);

  useEffect(() => {
    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    const transactionType = asset.type ? TransferType[asset.type] : TransactionType.TRANSFER;
    const transferTx = buildTransaction(
      transactionType,
      toAddress(activeAccount?.accountId || TEST_ACCOUNT_ID, { prefix: addressPrefix }),
      chainId,
      {
        dest: formData?.destination,
        value: formData?.amount,
        ...(transactionType !== TransactionType.TRANSFER && { asset: getAssetId(asset) }),
      },
    );

    onTxChange([transferTx]);
  }, [activeAccount, formData?.amount, formData?.destination]);

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
            getSignatoryOption={getSignatoryDrowdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={changeSignatory}
            onAccountChange={changeAccount}
          />
        }
        footer={
          activeAccount &&
          formData && (
            <OperationFooterNew
              api={api}
              asset={asset}
              account={activeAccount}
              totalAccounts={1}
              getFee={getFee}
              onFeeChange={setFee}
              onFeeLoading={setFeeIsLoading}
              onDepositChange={setDeposit}
            />
          )
        }
        onTxChange={setFormData}
        onSubmit={(tx) => onResult(tx, formData?.description)}
      />
    </div>
  );
};
