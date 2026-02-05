import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, getNativeAsset, truncate } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons';
import { AssetBalance } from '@/shared/ui-entities';
import { Box, Copy, Json, Modal, Tooltip, useNotification } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { networkModel, useNetworkData } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { type TabFilter, operationsContextModel } from '../model/context';

type Props = {
  operation: MultisigOperation;
  tab: TabFilter;
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

export const OperationAdvancedDetails = ({ operation, tab }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];
  const { api } = useNetworkData(operation.chainId);

  const nativeAsset = getNativeAsset(chain?.assets ?? []);
  const explorers = chain?.explorers;

  const { indexCreated, blockCreated, deposit, callHash, callData } = operation;

  const jsonArgs = useMemo(() => {
    if (!callData || !api || !chain) {
      return null;
    }

    try {
      const call = transactionService.createCallFromCallData(callData, api);
      if (!call) return null;

      return transactionService.formatCall(call, chain);
    } catch {
      return null;
    }
  }, [api, chain, callData]);

  const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  const isHiddenTab = tab === 'hidden';

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
              name={isHiddenTab ? 'eye' : 'eyeSlashed'}
              className="text-icon-default"
              onClick={isHiddenTab ? handleUnhideOperation : handleHideOperation}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>{isHiddenTab ? t('operation.unhideButton') : t('operation.hideButton')}</Tooltip.Content>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-y-2">
        {callHash && (
          <DetailRow label={t('operation.details.callHash')} className="text-text-secondary">
            <Copy value={callHash}>
              <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                <FootnoteText className="text-inherit">{truncate(callHash, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Copy>
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

        {deposit && nativeAsset && (
          <DetailRow label={t('operation.details.deposit')} className="text-text-secondary">
            <AssetBalance value={deposit} asset={nativeAsset} className="py-[3px] text-footnote text-text-secondary" />
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
