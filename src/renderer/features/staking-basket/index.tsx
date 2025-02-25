import { useGate, useStoreMap } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle, OperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import {
  BondExtraConfirmation,
  BondNominateConfirmation,
  NominateConfirmation,
  PayeeConfirmation,
  RestakeConfirmation,
  UnstakeConfirmation,
  WithdrawConfirmation,
} from '@/features/operations/OperationsConfirm';
import {
  bondExtraValidateModel,
  bondNominateValidateModel,
  nominateValidateModel,
  payeeValidateModel,
  restakeValidateModel,
  unstakeValidateModel,
  withdrawValidateModel,
} from '@/features/operations/OperationsValidation';

import { confirm } from './model/confirm';
import { stakingBasketFeature } from './model/feature';

export { stakingBasketFeature };

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: 'operations.titles.startStaking',
    [TransactionType.NOMINATE]: 'operations.titles.nominate',
    [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
    [TransactionType.REDEEM]: 'operations.titles.redeem',
    [TransactionType.RESTAKE]: 'operations.titles.restake',
    [TransactionType.DESTINATION]: 'operations.titles.destination',
    [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: 'operations.modalTitles.startStakingOn',
    [TransactionType.NOMINATE]: 'operations.modalTitles.nominateOn',
    [TransactionType.STAKE_MORE]: 'operations.modalTitles.stakeMoreOn',
    [TransactionType.REDEEM]: 'operations.modalTitles.redeemOn',
    [TransactionType.RESTAKE]: 'operations.modalTitles.restakeOn',
    [TransactionType.DESTINATION]: 'operations.modalTitles.destinationOn',
    [TransactionType.UNSTAKE]: 'operations.modalTitles.unstakeOn',
  };

  return Title[transaction.type];
};

const getOperationIcon = (transaction: Transaction): IconNames | undefined => {
  const Icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.BOND]: 'startStakingMst',
    [TransactionType.NOMINATE]: 'changeValidatorsMst',
    [TransactionType.STAKE_MORE]: 'stakeMoreMst',
    [TransactionType.REDEEM]: 'redeemMst',
    [TransactionType.RESTAKE]: 'returnToStakeMst',
    [TransactionType.DESTINATION]: 'destinationMst',
    [TransactionType.UNSTAKE]: 'unstakeMst',
  };

  return Icon[transaction.type];
};

basketSDK(stakingBasketFeature, {
  operationTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);
    const chain = useStoreMap({
      store: networkModel.$chains,
      keys: [tx.chainId],
      fn: (chains, [id]) => chains[id] ?? null,
    });

    const title = getOperationTitle(tx);
    const icon = getOperationIcon(tx);

    if (title && icon) {
      const amount = tx.args.value;
      const nativeAsset = getNativeAsset(chain.assets);

      return (
        <>
          <TransactionTitle className="w-[186px]" title={t(title)} icon={icon} />

          {nativeAsset && amount && (
            <div className="w-[160px]">
              <AssetBalance value={amount} asset={nativeAsset} showIcon />
            </div>
          )}

          <ChainTitle chainId={tx.chainId} />
        </>
      );
    }

    return null;
  },
  transactionConfirmTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);
    const chain = useStoreMap({
      store: networkModel.$chains,
      keys: [tx.chainId],
      fn: (chains, [id]) => chains[id] ?? null,
    });

    const title = getModalTitle(tx);

    if (title) {
      const nativeAsset = getNativeAsset(chain.assets);
      return (
        <OperationTitle
          className="justify-center"
          title={t(title, { asset: nativeAsset.symbol })}
          chainId={tx.chainId}
        />
      );
    }

    return null;
  },
  transactionConfirmDetails({ transaction }) {
    useGate(confirm.flow, transaction);

    const tx = basketOperationsService.getCoreTx(transaction);

    if (tx.type === TransactionType.BOND) {
      return <BondNominateConfirmation id={transaction.id} hideSignButton config={{ withFormatAmount: false }} />;
    }
    if (tx.type === TransactionType.STAKE_MORE) {
      return <BondExtraConfirmation id={transaction.id} hideSignButton config={{ withFormatAmount: false }} />;
    }
    if (tx.type === TransactionType.UNSTAKE) {
      return <UnstakeConfirmation id={transaction.id} hideSignButton />;
    }
    if (tx.type === TransactionType.RESTAKE) {
      return <RestakeConfirmation id={transaction.id} hideSignButton />;
    }
    if (tx.type === TransactionType.REDEEM) {
      return <WithdrawConfirmation id={transaction.id} hideSignButton />;
    }
    if (tx.type === TransactionType.NOMINATE) {
      return <NominateConfirmation id={transaction.id} hideSignButton />;
    }
    if (tx.type === TransactionType.DESTINATION) {
      return <PayeeConfirmation id={transaction.id} hideSignButton />;
    }

    return null;
  },
  validation(errors, { transaction }) {
    if (transaction.coreTx.type === TransactionType.BOND) {
      return bondNominateValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.STAKE_MORE) {
      return bondExtraValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.UNSTAKE) {
      return unstakeValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.RESTAKE) {
      return restakeValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.REDEEM) {
      return withdrawValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }
    if (transaction.coreTx.type === TransactionType.NOMINATE) {
      return nominateValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    // TODO implement
    if (transaction.coreTx.type === TransactionType.DESTINATION) {
      return payeeValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    return errors;
  },
});
