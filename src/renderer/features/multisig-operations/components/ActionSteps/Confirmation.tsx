import { type ApiPromise } from '@polkadot/api';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Account, type Chain, type MultisigAccount, type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { DetailRow, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { SignButton, operationDetailsUtils } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import { Fee, FeeLoader, MultisigDepositWithLabel, XcmFee, isXcmTransaction } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { useDecodedTransaction, useTransactionAsset } from '@/features/transfer-operation-details';
import { xcmTransferModel } from '@/widgets/Transfer';
import { OperationDetails } from '../OperationDetails';

import { getIconName } from './transactionConfirmIcon';

export const confirmTransactionInfoSlot = createSlot<{
  operation: MultisigOperation;
}>();

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount;
  signAccount?: Account;
  chain: Chain;
  api: ApiPromise;
  feeTx?: Transaction | null;
  onSign: () => void;
};
export const Confirmation = ({ api, operation, account, chain, signAccount, feeTx, onSign }: Props) => {
  const { t } = useI18n();
  const [isFeeLoaded, setIsFeeLoaded] = useState(false);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const wallets = useUnit(walletModel.$wallets);
  const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: walletUtils.isValidSignatory,
    accountFn: acc => signAccount?.accountId === acc.accountId,
  });

  const xcmConfig = useUnit(xcmTransferModel.$config);
  const transaction = operation.transaction;

  const decoded = useDecodedTransaction(operation.transaction, chain.chainId);
  const asset = useTransactionAsset(operation.transaction, chain.chainId);

  const xcmApi = useStoreMap({
    store: networkModel.$apis,
    keys: [decoded],
    fn: (apis, [decoded]) => {
      if (decoded && isXcmTransaction(decoded)) {
        const destinationChain = operationDetailsUtils.getDestinationChain(decoded);
        return destinationChain ? (apis[destinationChain] ?? null) : null;
      }

      return null;
    },
  });

  useEffect(() => {
    if (asset) {
      xcmTransferModel.events.xcmStarted({ chain, asset });
    }
  }, [chain, asset]);

  return (
    <div className="flex flex-col items-center gap-y-3 px-5 pb-4">
      <div className="mb-6 flex flex-col items-center gap-y-3">
        {decoded ? <Icon className="text-icon-default" name={getIconName(decoded)} size={60} /> : null}

        {transaction && <Slot id={confirmTransactionInfoSlot} props={{ operation: operation }} />}
      </div>

      <TransactionDetails chain={chain} wallets={wallets} initiator={[account]} signatory={signAccount ?? null}>
        <OperationDetails operation={operation} />

        {signAccount && api && (
          <MultisigDepositWithLabel
            api={api}
            asset={chain.assets[0]}
            className="text-footnote"
            threshold={(account as MultisigAccount).threshold}
          />
        )}

        <DetailRow label={t('operation.networkFee')} className="text-text-primary">
          {api && feeTx ? (
            <Fee
              className="text-footnote"
              api={api}
              asset={chain.assets[0]}
              transaction={feeTx}
              onFeeChange={fee => setIsFeeLoaded(Boolean(fee))}
            />
          ) : (
            <FeeLoader fiatFlag={!!fiatFlag} />
          )}
        </DetailRow>

        {isXcmTransaction(transaction) && xcmConfig && xcmApi && asset && (
          <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
            <XcmFee api={xcmApi} transaction={transaction} asset={asset} config={xcmConfig} />
          </DetailRow>
        )}
      </TransactionDetails>

      <SignButton disabled={!isFeeLoaded} className="ml-auto mt-3" type={signerWallet?.type} onClick={onSign} />
    </div>
  );
};
