import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { useStore } from 'effector-react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useAccount, Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { formatAmount, getAssetId, TEST_ACCOUNT_ID, toAddress, toHexChainId } from '@renderer/shared/lib/utils';
import { Chain, Explorer } from '@renderer/entities/chain';
import { Asset, AssetType, useBalance } from '@renderer/entities/asset';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { TransferForm, TransferFormData } from '../TransferForm';
import { getAccountOption, getSignatoryOption } from '../../common/utils';
import { OperationFooter, OperationHeader } from '@renderer/features/operation';
import * as sendAssetModel from '../../../model/send-asset';
import { useNetworkContext } from '@renderer/app/providers';
import { XcmTransferType } from '@renderer/shared/api/xcm';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  network: string;
  asset: Asset;
  nativeToken: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  feeTx: Transaction;
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
  feeTx,
  onTxChange,
  onAccountChange,
  onSignatoryChange,
}: Props) => {
  const { buildTransaction } = useTransaction();
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
  const reserveAsset = useStore(sendAssetModel.$xcmAsset);

  const accounts = getActiveAccounts();

  const [fee, setFee] = useState<string>('0');
  const [feeIsLoading, setFeeIsLoading] = useState(false);
  const [deposit, setDeposit] = useState<string>('0');
  const [formData, setFormData] = useState<Partial<TransferFormData>>();
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

  const amount = formData?.amount || '0';
  const isXcmTransfer = formData?.destinationChain?.value !== chainId && !!xcmTransfer;
  const isXcmValid = Boolean(xcmFee && xcmAsset && xcmBeneficiary && xcmDest);

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

    if (!options.length) return;

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

  useEffect(() => {
    const TransferType: Record<AssetType, TransactionType> = {
      [AssetType.ORML]: TransactionType.ORML_TRANSFER,
      [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
    };

    const isNativeTransfer = !asset.type;

    let transactionType;
    let args: any = {
      dest: toAddress(formData?.destination || '', { prefix: addressPrefix }),
      value: formatAmount(amount, asset.precision),
      ...(!isNativeTransfer && { asset: getAssetId(asset) }),
    };

    if (isXcmTransfer) {
      const destinationChain = formData?.destinationChain?.value
        ? connections[formData?.destinationChain?.value as ChainId]
        : undefined;
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

    const transferTx = buildTransaction(
      transactionType,
      toAddress(activeAccount?.accountId || TEST_ACCOUNT_ID, { prefix: addressPrefix }),
      chainId,
      args,
    );

    onTxChange([transferTx]);
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

  const getXcmTransferType = (type: XcmTransferType): TransactionType => {
    if (type === 'xtokens') {
      return TransactionType.XTOKENS_TRANSFER_MULTIASSET;
    }

    if (type === 'xcmpallet-teleport') {
      return api.tx.xcmPallet ? TransactionType.XCM_TELEPORT : TransactionType.POLKADOT_XCM_TELEPORT;
    }

    return api.tx.xcmPallet ? TransactionType.XCM_LIMITED_TRANSFER : TransactionType.POLKADOT_XCM_LIMITED_TRANSFER;
  };

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

  const reserveChainId =
    reserveAsset && config && toHexChainId(config.assetsLocation[reserveAsset.assetLocation].chainId);
  const reserveApi = reserveChainId && connections[reserveChainId]?.api;

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
        isXcmTransfer={isXcmTransfer}
        isXcmValid={isXcmValid}
        xcmFee={xcmFee}
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
          formData && (
            <OperationFooter
              api={api}
              reserveApi={reserveApi || undefined}
              asset={nativeToken}
              account={activeAccount}
              totalAccounts={1}
              feeTx={feeTx}
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
        onSubmit={(tx) => onResult(tx, formData?.description)}
      />
    </div>
  );
};
