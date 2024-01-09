import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { useStore, useUnit } from 'effector-react';

import { getAssetId, TEST_ACCOUNT_ID, toAddress, toHexChainId } from '@shared/lib/utils';
import { Transaction, TransactionType, useTransaction } from '@entities/transaction';
import { TransferForm, TransferFormData } from '../TransferForm';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@features/operation';
import * as sendAssetModel from '../../../model/send-asset';
import { XcmTransferType } from '@shared/api/xcm';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { AssetType } from '@shared/core';
import type { ChainId, Asset, Explorer, Account, MultisigAccount, Chain, Wallet } from '@shared/core';
import { networkModel } from '@entities/network';
import { useAssetBalances } from '@entities/balance';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  tx?: Transaction;
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
  tx,
  onTxChange,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const { buildTransaction, getTransactionHash } = useTransaction();

  const activeAccounts = useUnit(walletModel.$activeAccounts);
  const activeWallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);
  const connections = useUnit(networkModel.$connections);
  const apis = useUnit(networkModel.$apis);

  const availableDestinations = useStore(sendAssetModel.$destinations);
  const config = useStore(sendAssetModel.$finalConfig);
  const xcmAsset = useStore(sendAssetModel.$txAsset);
  const xcmDest = useStore(sendAssetModel.$txDest);
  const xcmBeneficiary = useStore(sendAssetModel.$txBeneficiary);
  const xcmTransfer = useStore(sendAssetModel.$xcmTransfer);
  const xcmFee = useStore(sendAssetModel.$xcmFee);
  const xcmWeight = useStore(sendAssetModel.$xcmWeight);
  const reserveAsset = useStore(sendAssetModel.$xcmAsset);

  const [fee, setFee] = useState<string>('0');
  const [feeIsLoading, setFeeIsLoading] = useState(false);
  const [deposit, setDeposit] = useState<string>('0');
  const [formData, setFormData] = useState<Partial<TransferFormData>>();
  const [destinations, setDestinations] = useState<Chain[]>([]);

  const [activeAccount, setActiveAccount] = useState<Account | MultisigAccount>();
  const [activeSignatory, setActiveSignatory] = useState<Account>();

  const accountIds = activeAccounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId.toString(),
  });
  const nativeBalances = useAssetBalances({
    accountIds,
    chainId,
    assetId: nativeToken?.assetId.toString() || '',
  });

  const isMultisigAccount = activeAccount && accountUtils.isMultisigAccount(activeAccount);
  const signatoryIds = isMultisigAccount ? activeAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = useAssetBalances({
    accountIds: signatoryIds,
    chainId,
    assetId: nativeToken?.assetId.toString() || asset?.assetId.toString() || '',
  });

  const amount = formData?.amount || '0';
  const isXcmTransfer = formData?.destinationChain?.value !== chainId && !!xcmTransfer;
  const isXcmValid = Boolean(xcmFee && xcmAsset && xcmBeneficiary && xcmDest);

  useEffect(() => {
    if (!availableDestinations?.length) return;

    const options = [...availableDestinations].reduce<Chain[]>((acc, destination) => {
      // eslint-disable-next-line i18next/no-literal-string
      const chainId = `0x${destination.destination.chainId}` as ChainId;
      const chain = chains[chainId];
      const connection = connections[chainId];

      if (chain && connection.connectionType !== 'DISABLED') {
        acc.push(chain);
      }

      return acc;
    }, []);

    if (!options.length) return;

    setDestinations([chains[chainId], ...options]);
  }, [availableDestinations.length]);

  useEffect(() => {
    const chainAccount =
      activeAccounts.find((account) => accountUtils.isChainIdMatch(account, chainId)) || activeAccounts[0];

    setActiveAccount(chainAccount);
    onAccountChange(chainAccount);
  }, [accountIds.join('')]);

  useEffect(() => {
    if (!isMultisigAccount) {
      setDeposit('0');
    }
  }, [activeAccount]);

  useEffect(() => {
    onTxChange([buildTransferTx()]);
  }, [
    activeAccount,
    formData?.amount,
    formData?.destination,
    xcmFee,
    xcmAsset,
    xcmBeneficiary,
    xcmDest,
    formData?.destinationChain,
    isXcmTransfer,
  ]);

  const getCallhash = () => {
    if (!tx) return;

    return getTransactionHash(tx, api).callHash;
  };

  const buildTransferTx = (): Transaction => {
    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    const isNativeTransfer = !asset.type;

    let transactionType;
    let args: any = {
      dest: toAddress(formData?.destination || '', { prefix: addressPrefix }),
      value: amount,
      ...(!isNativeTransfer && { asset: getAssetId(asset) }),
    };

    if (isXcmTransfer) {
      const destinationChain = formData?.destinationChain?.value;
      transactionType = getXcmTransferType(xcmTransfer.type);

      args = {
        ...args,
        destinationChain,
        xcmFee: xcmFee,
        xcmAsset: xcmAsset || undefined,
        xcmDest: xcmDest || undefined,
        xcmBeneficiary: xcmBeneficiary || undefined,
        xcmWeight: xcmWeight,
      };
    } else {
      transactionType = isNativeTransfer ? TransactionType.TRANSFER : TransferType[asset.type!];
    }

    return buildTransaction(
      transactionType,
      toAddress(activeAccount?.accountId || TEST_ACCOUNT_ID, { prefix: addressPrefix }),
      chainId,
      args,
    );
  };

  const getXcmTransferType = (type: XcmTransferType): TransactionType => {
    if (type === XcmTransferType.XTOKENS) {
      return TransactionType.XTOKENS_TRANSFER_MULTIASSET;
    }

    if (type === XcmTransferType.XCMPALLET_TELEPORT) {
      return api.tx.xcmPallet ? TransactionType.XCM_TELEPORT : TransactionType.POLKADOT_XCM_TELEPORT;
    }

    return api.tx.xcmPallet ? TransactionType.XCM_LIMITED_TRANSFER : TransactionType.POLKADOT_XCM_LIMITED_TRANSFER;
  };

  const getAccountDropdownOption = (account: Account) => {
    const balance = balances.find((b) => b.accountId === account.accountId);
    const nativeBalance = nativeBalances.find((b) => b.accountId === account.accountId);
    const hideName = walletUtils.isPolkadotVault(activeWallet) && accountUtils.isShardAccount(account);

    return getAccountOption(account, {
      addressPrefix,
      asset,
      amount,
      balance,
      nativeBalance,
      fee,
      deposit,
      hideName,
    });
  };

  const getSignatoryDropdownOption = (wallet: Wallet, account: Account) => {
    const balance = signatoriesBalances.find((b) => b.accountId === account.accountId);

    return getSignatoryOption(wallet, account, { addressPrefix, asset: nativeToken || asset, balance, fee, deposit });
  };

  const changeAccount = (account: Account | MultisigAccount) => {
    onAccountChange(account);
    setActiveAccount(account);
  };

  const changeSignatory = (account: Account | MultisigAccount) => {
    onSignatoryChange(account);
    setActiveSignatory(account);
  };

  const reserveChainId =
    reserveAsset && config && toHexChainId(config.assetsLocation[reserveAsset.assetLocation].chainId);
  const reserveApi = reserveChainId && apis[reserveChainId];

  return (
    <div className="flex flex-col gap-y-4 pb-4 px-5">
      <TransferForm
        chain={chains[chainId]}
        network={network}
        accounts={activeAccounts}
        account={activeAccount}
        signer={activeSignatory}
        asset={asset}
        nativeToken={nativeToken}
        addressPrefix={addressPrefix}
        fee={fee}
        getCallHash={getCallhash}
        isXcmTransfer={isXcmTransfer}
        isXcmValid={isXcmValid}
        xcmFee={xcmFee}
        deposit={deposit}
        feeIsLoading={feeIsLoading}
        destinations={destinations}
        header={
          <OperationHeader
            chainId={chainId}
            accounts={activeAccounts}
            getSignatoryOption={getSignatoryDropdownOption}
            getAccountOption={getAccountDropdownOption}
            onSignatoryChange={changeSignatory}
            onAccountChange={changeAccount}
          />
        }
        footer={
          activeAccount &&
          formData && (
            <OperationFooter
              api={api}
              reserveApi={reserveApi || undefined}
              asset={nativeToken}
              account={activeAccount}
              totalAccounts={1}
              feeTx={tx}
              xcmConfig={config || undefined}
              xcmAsset={asset}
              onXcmFeeChange={sendAssetModel.events.xcmFeeChanged}
              onFeeChange={setFee}
              onFeeLoading={setFeeIsLoading}
              onDepositChange={setDeposit}
            />
          )
        }
        onTxChange={setFormData}
        onSubmit={() => onResult(buildTransferTx(), formData?.description)}
      />
    </div>
  );
};
