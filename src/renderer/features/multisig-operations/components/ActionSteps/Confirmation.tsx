import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type Asset, type Chain, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, getAssetById, getAssetByTypeExtras, getNativeAsset, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
  TransactionValidationError,
} from '@/shared/ui-entities';
import { Box, Copy, Json, Modal } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { SignButton, operationDetailsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { Details } from '../Details';

import { getIconName } from './transactionConfirmIcon';

export const confirmTransactionInfoSlot = createSlot<{
  operation: MultisigOperation;
}>();

type Props = {
  operation: MultisigOperation;
  multisigAccount?: MultisigAccount | FlexibleMultisigAccount | null;
  initiator?: AnyAccount | null;
  signAccount?: AnyAccount | null;
  chain: Chain;
  api: ApiPromise;
  fee: BN | null;
  multisigDeposit: BN;
  valid: boolean;
  isFeeLoading: boolean;
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
  multisigAccount,
  initiator,
  chain,
  signAccount,
  fee,
  multisigDeposit,
  valid,
  isFeeLoading,
  onSign,
  onGoBack,
  errors,
  isDepositRequired = false,
}: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const signerWallet = wallets.find(w => w.id === signAccount?.walletId);

  const hasRequiredDeposit = !isDepositRequired || !multisigDeposit.isZero();
  const canSign = !isFeeLoading && hasRequiredDeposit && valid;

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

        <Slot id={confirmTransactionInfoSlot} props={{ operation }} />
      </div>
      {initiator && signAccount && (
        <Details
          api={api}
          operation={operation}
          account={initiator}
          multisigAccount={multisigAccount}
          chain={chain}
          signatory={signAccount}
        />
      )}
      <OperationMeta operation={operation} chain={chain} api={api} />
      {asset && isDepositRequired && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
      {asset && <FeeWithLabel fee={fee} asset={asset} isLoading={isFeeLoading} />}
      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton disabled={!canSign} className="ml-auto" type={signerWallet?.type} onClick={onSign} />
      </div>
    </div>
  );
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

const OperationMeta = ({ operation, chain, api }: { operation: MultisigOperation; chain: Chain; api: ApiPromise }) => {
  const { t } = useI18n();

  const { callHash, callData, blockCreated, indexCreated } = operation;
  const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(
    callHash,
    indexCreated,
    blockCreated,
    chain.explorers,
  );

  const jsonArgs = (() => {
    if (!callData || !api) return null;

    try {
      const call = transactionService.createCallFromCallData(callData, api);
      if (!call) return null;

      return transactionService.formatCall(call, chain);
    } catch {
      return null;
    }
  })();

  const hasTimePoint = Boolean(indexCreated && blockCreated);
  const hasContent = hasTimePoint || Boolean(callData);

  if (!hasContent) return null;

  return (
    <dl className="flex w-full flex-col gap-y-4">
      {hasTimePoint && (
        <DetailRow label={t('operation.details.timePoint')} className="text-text-secondary">
          {extrinsicLink ? (
            <a
              className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
              href={extrinsicLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FootnoteText className="text-text-secondary">
                {blockCreated}-{indexCreated}
              </FootnoteText>
              <Icon name="globe" size={16} className="group-hover:text-icon-hover" />
            </a>
          ) : (
            <FootnoteText className="text-text-secondary">
              {blockCreated}-{indexCreated}
            </FootnoteText>
          )}
        </DetailRow>
      )}

      {callData && (
        <DetailRow label={t('operation.details.callData')} className="text-text-secondary">
          <div className="flex items-center gap-1">
            <Copy value={callData}>
              <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Copy>
            {jsonArgs && (
              <Modal size="lg" height="fit">
                <Modal.Trigger>
                  <button type="button" className={cnTw('group', InteractionStyle)}>
                    <Icon name="details" size={16} className="group-hover:text-icon-hover" />
                  </button>
                </Modal.Trigger>
                <Modal.Title close>{t('operation.viewJSON.label')}</Modal.Title>
                <Modal.Content>
                  <Box padding={5}>
                    <Json value={jsonArgs} name="operation" />
                  </Box>
                </Modal.Content>
              </Modal>
            )}
          </div>
        </DetailRow>
      )}
    </dl>
  );
};
