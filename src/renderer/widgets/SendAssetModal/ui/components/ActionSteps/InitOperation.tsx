import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { useStore } from 'effector-react';

import { AccountId, ChainId } from '@renderer/domain/shared-kernel';
import { useAccount, Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { Chain, Explorer } from '@renderer/entities/chain';
import { Asset, useBalance } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { TransferForm } from '../TransferForm';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';
import * as sendAssetModel from '../../../model/send-asset';
import { useNetworkContext } from '@renderer/app/providers';

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

export const InitOperation = ({
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
  const { connections } = useNetworkContext();
  const availableDestinations = useStore(sendAssetModel.$destinations);
  const config = useStore(sendAssetModel.$finalConfig);
  const xcmAsset = useStore(sendAssetModel.$txAsset);
  const xcmDest = useStore(sendAssetModel.$txDest);
  const xcmBeneficiary = useStore(sendAssetModel.$txBeneficiary);
  const xcmTransfer = useStore(sendAssetModel.$xcmTransfer);
  const xcmFee = useStore(sendAssetModel.$xcmFee);
  const xcmWeight = useStore(sendAssetModel.$xcmWeight);

  const accounts = getActiveAccounts();

  const [fee, setFee] = useState<string>('0');
  const [feeIsLoading, setFeeIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>('0');
  const [deposit, setDeposit] = useState<string>('0');
  const [tx, setTx] = useState<Transaction>();
  const [destinations, setDestinations] = useState<Chain[]>([]);

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
    if (!availableDestinations?.length) return;

    const options = [...availableDestinations].reduce<Chain[]>((acc, destination) => {
      // eslint-disable-next-line i18next/no-literal-string
      const chainId = `0x${destination.destination.chainId}` as ChainId;
      const connection = connections[chainId];

      if (connection && connection.connection.connectionType !== 'DISABLED') {
        acc.push(connection);
      }

      return acc;
    }, []);

    setDestinations([connections[chainId], ...options]);
  }, [availableDestinations.length]);

  useEffect(() => {
    setActiveAccount(accounts[0]);
    onAccountChange(accounts[0]);
  }, [accounts.length, accounts[0]?.accountId]);

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

  const changeDestinationChain = (chainId: ChainId) => {
    sendAssetModel.events.destinationChainSelected(connections[chainId]);
  };

  const changeDestination = (accountId: AccountId) => {
    sendAssetModel.events.accountIdSelected(accountId);
  };

  const changeAmount = (amount: string) => {
    setAmount(amount);
    sendAssetModel.events.amountChanged(amount);
  };

  return (
    <div className="flex flex-col gap-y-4">
      <TransferForm
        api={api}
        chainId={chainId}
        chain={connections[chainId]}
        network={network}
        accounts={accounts}
        account={activeAccount}
        signer={activeSignatory}
        asset={asset}
        nativeToken={nativeToken}
        addressPrefix={addressPrefix}
        fee={fee}
        xcmParams={{
          fee: xcmFee,
          weight: xcmWeight,
          dest: xcmDest || undefined,
          beneficiary: xcmBeneficiary || undefined,
          transfer: xcmTransfer || undefined,
          asset: xcmAsset || undefined,
        }}
        deposit={deposit}
        feeIsLoading={feeIsLoading}
        destinations={destinations}
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
          tx && (
            <OperationFooter
              api={api}
              asset={nativeToken}
              account={activeAccount}
              totalAccounts={1}
              transaction={tx}
              xcmConfig={config || undefined}
              xcmAsset={asset}
              onXcmFeeChange={sendAssetModel.events.xcmFeeChanged}
              onFeeChange={setFee}
              onFeeLoading={setFeeIsLoading}
              onDepositChange={setDeposit}
            />
          )
        }
        onTxChange={setTx}
        onSubmit={onResult}
        onChangeAmount={changeAmount}
        onDestinationChainChange={changeDestinationChain}
        onDestinationChange={changeDestination}
      />
    </div>
  );
};
