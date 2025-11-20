import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getAssetById, getAssetByTypeExtras, getNativeAsset } from '@/shared/lib/utils';
import { Button, Icon } from '@/shared/ui';
import {
  type TransactionValidationBalanceError,
  TransactionValidationError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
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
  valid: boolean;
  isFeeLoading: boolean;
  isDepositLoading: boolean;
  isDepositRequired?: boolean;
  onSign: () => void;
  onGoBack?: () => void;
  errors?: (
    | TransactionValidationBalanceError
    | TransactionValidationPermissionError
    | TransactionValidationFatalError
  )[];
};
export const Confirmation = ({
  api,
  operation,
  chain,
  signAccount,
  fee,
  multisigDeposit,
  valid,
  isFeeLoading,
  isDepositLoading,
  onSign,
  onGoBack,
  errors,
  isDepositRequired = false,
}: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const initiator = useUnit(operationsContextModel.$initiator);

  const signerWallet = wallets.find(w => w.id === signAccount?.walletId);

  const depositPending = isDepositRequired && isDepositLoading;

  const transaction = operation.transaction;
  let asset: Asset | null = null;
  if (transaction) {
    if (transaction.args.assetId) {
      asset = getAssetByTypeExtras(api, chain.assets, transaction.args.assetId) ?? getNativeAsset(chain.assets);
    } else {
      asset = getAssetById(transaction.args.asset, chain.assets) ?? getNativeAsset(chain.assets);
    }
  }

  return (
    <div className="flex flex-col items-center gap-y-3 px-5 pb-4">
      {errors && <TransactionValidationError errors={errors} wallets={wallets} />}

      <div className="mb-6 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={getIconName(transaction)} size={60} />

        {transaction && <Slot id={confirmTransactionInfoSlot} props={{ operation }} />}
      </div>
      {initiator && signAccount && (
        <Details api={api} operation={operation} account={initiator} chain={chain} signatory={signAccount} />
      )}
      {asset && isDepositRequired && (
        <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={isDepositLoading} />
      )}
      {asset && <FeeWithLabel fee={fee} asset={asset} isLoading={isFeeLoading} />}
      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton
          disabled={isFeeLoading || depositPending || !valid}
          className="ml-auto"
          type={signerWallet?.type}
          onClick={onSign}
        />
      </div>
    </div>
  );
};
