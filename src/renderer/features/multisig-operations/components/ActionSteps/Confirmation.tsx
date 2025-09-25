import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getAssetByOnChainId, getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, Icon } from '@/shared/ui';
import {
  type TransactionValidationBalanceError,
  TransactionValidationError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositFee, XcmFee, isXcmTransaction } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { xcmTransferModel } from '@/widgets/Transfer';
import { operationsContextModel } from '../../model/context';
import { Details } from '../Details';

import { getIconName } from './transactionConfirmIcon';

export const confirmTransactionInfoSlot = createSlot<{
  operation: MultisigOperation;
}>();

type Props = {
  operation: MultisigOperation;
  signAccount?: AnyAccount | null;
  chain: Chain;
  api: ApiPromise;
  fee: BN;
  multisigDeposit: BN;
  errors: (
    | TransactionValidationBalanceError
    | TransactionValidationPermissionError
    | TransactionValidationFatalError
  )[];
  isFeeLoading: boolean;
  isDepositLoading: boolean;
  onSign: () => void;
  onGoBack?: () => void;
};
export const Confirmation = ({
  api,
  operation,
  chain,
  signAccount,
  fee,
  multisigDeposit,
  errors,
  isFeeLoading,
  isDepositLoading,
  onSign,
  onGoBack,
}: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const initiator = useUnit(operationsContextModel.$initiator);

  const signerWallet = wallets.find(w => w.id === signAccount?.walletId);

  const xcmConfig = useUnit(xcmTransferModel.$config);
  const transaction = operation.transaction;
  let asset: Asset | null = null;
  if (transaction) {
    asset = getAssetByOnChainId(transaction.args.asset, chain.assets) ?? getNativeAsset(chain.assets);
  }

  const xcmApi = useStoreMap({
    store: networkModel.$apis,
    keys: [transaction],
    fn: (apis, [transaction]) => {
      if (transaction && isXcmTransaction(transaction)) {
        return apis[transaction.args.destinationChain] ?? null;
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
      <TransactionValidationError errors={errors} wallets={wallets} />

      <div className="mb-6 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={getIconName(transaction)} size={60} />

        {transaction && <Slot id={confirmTransactionInfoSlot} props={{ operation }} />}
      </div>
      {initiator && signAccount && (
        <Details api={api} operation={operation} account={initiator} chain={chain} signatory={signAccount} />
      )}
      {asset && (
        <>
          <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={isDepositLoading} />
          <FeeWithLabel fee={fee} asset={asset} isLoading={isFeeLoading} />
        </>
      )}
      {isXcmTransaction(transaction) && xcmConfig && xcmApi && asset && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
          <XcmFee api={xcmApi} transaction={transaction} asset={asset} config={xcmConfig} />
        </DetailRow>
      )}
      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton
          disabled={isFeeLoading || isDepositLoading || errors.length !== 0}
          className="ml-auto"
          type={signerWallet?.type}
          onClick={onSign}
        />
      </div>
    </div>
  );
};
