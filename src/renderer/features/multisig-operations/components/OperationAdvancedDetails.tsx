import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, truncate } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { Copy, Modal, Tooltip, useNotification } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { type MultisigOperation, transactionService as networkTransactionService } from '@/domains/network';
import { networkModel, useNetworkData } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { operationsContextModel } from '../model/context';

type Props = {
  operation: MultisigOperation;
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

type DisplayCall = {
  callHash?: HexString | null;
};

export const getCallDetailsLabelKeys = (displayCall: DisplayCall, outerCall: DisplayCall) => {
  const isCoreCall = Boolean(displayCall.callHash && outerCall.callHash && displayCall.callHash !== outerCall.callHash);

  return {
    callHash: isCoreCall ? 'operation.details.coreCallHash' : 'operation.details.callHash',
    callData: isCoreCall ? 'operation.details.coreCallData' : 'operation.details.callData',
  } as const;
};

export const OperationAdvancedDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const chains = useUnit(networkModel.$chains);
  const hiddenOperationIds = useUnit(operationsContextModel.$hiddenOperationIds);
  const chain = chains[operation.chainId];
  const { api } = useNetworkData(operation.chainId);

  const explorers = chain?.explorers;

  const { indexCreated, blockCreated, callHash, callData, callDataMismatch } = operation;
  const displayCall = useMemo(
    () => networkTransactionService.getCoreCallData(api, callData) ?? { callData, callHash },
    [api, callData, callHash],
  );
  const callDetailsLabelKeys = getCallDetailsLabelKeys(displayCall, operation);

  const jsonArgs = useMemo(() => {
    if (!displayCall.callData || !api || !chain) {
      return null;
    }

    try {
      const call = transactionService.createCallFromCallData(displayCall.callData, api);
      if (!call) return null;

      return transactionService.formatCall(call, chain);
    } catch {
      return null;
    }
  }, [api, chain, displayCall.callData]);

  const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  // Keyed off the actual hidden state (not the active tab): the merged scope
  // can surface hidden operations via the Status filter while the tab stays
  // Pending, and the control must still offer "Unhide" there.
  const isHidden = hiddenOperationIds.includes(operation.id);

  const handleHideOperation = () => {
    operationsContextModel.hideOperation(operation.id);
    toast.success(t('operation.hideToast.success'), {
      action: {
        label: t('operation.hideToast.undo'),
        onClick: () => {
          operationsContextModel.unhideOperation(operation.id);
        },
      },
    });
  };

  const handleUnhideOperation = () => {
    operationsContextModel.unhideOperation(operation.id);
    toast.success(t('operation.unhideToast.success'), {
      action: {
        label: t('operation.unhideToast.undo'),
        onClick: () => {
          operationsContextModel.hideOperation(operation.id);
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <div className="flex items-center justify-between">
        <SmallTitleText>{t('operation.advanced')}</SmallTitleText>

        <Tooltip>
          <Tooltip.Trigger>
            <IconButton
              name={isHidden ? 'eye' : 'eyeSlashed'}
              className="text-icon-default"
              onClick={isHidden ? handleUnhideOperation : handleHideOperation}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>{isHidden ? t('operation.unhideButton') : t('operation.hideButton')}</Tooltip.Content>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-y-2">
        {displayCall.callHash && (
          <DetailRow label={t(callDetailsLabelKeys.callHash)} className="text-text-secondary">
            <Copy value={displayCall.callHash}>
              <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                <FootnoteText className="text-inherit">{truncate(displayCall.callHash, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Copy>
          </DetailRow>
        )}

        {displayCall.callData && (
          <DetailRow label={t(callDetailsLabelKeys.callData)} className="text-text-secondary">
            <div className="flex items-center gap-1">
              <Copy value={displayCall.callData}>
                <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                  <FootnoteText className="text-inherit">{truncate(displayCall.callData, 7, 8)}</FootnoteText>
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
                  <Modal.Content disableScroll>
                    <div className="max-h-[600px] overflow-y-auto p-5 break-all">
                      <Json value={jsonArgs} name="operation" />
                    </div>
                  </Modal.Content>
                </Modal>
              )}
            </div>
          </DetailRow>
        )}

        {!callData && callDataMismatch && (
          <DetailRow label={t(callDetailsLabelKeys.callData)} className="text-text-secondary">
            <FootnoteText className="text-text-negative">{t('operation.callData.indexerMismatch')}</FootnoteText>
          </DetailRow>
        )}

        {indexCreated && blockCreated && (
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
              `${blockCreated}-${indexCreated}`
            )}
          </DetailRow>
        )}
      </div>
    </div>
  );
};
