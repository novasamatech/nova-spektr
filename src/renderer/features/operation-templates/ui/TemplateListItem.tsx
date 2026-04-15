import { useStoreMap } from 'effector-react';
import { useMemo, useState } from 'react';

import { type CallData } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, IconButton, SmallTitleText } from '@/shared/ui';
import { Box, Copy, Modal, Tooltip } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import { useNotification } from '@/shared/ui-kit/NotificationContext';
import { type OperationTemplate, useTemplateMutations } from '@/domains/operation-templates';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';

import { RenameTemplateModal } from './RenameTemplateModal';

type Props = {
  template: OperationTemplate;
  currentSpecVersion: number | null;
  disabled?: boolean;
  onApply?: (template: OperationTemplate) => void;
};

export const TemplateListItem = ({ template, currentSpecVersion, disabled = false, onApply }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { save, remove } = useTemplateMutations();

  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [template.chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [template.chainId],
    fn: (apis, [id]) => apis[id] ?? null,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);

  const isStale = !disabled && currentSpecVersion !== null && template.specVersion !== currentSpecVersion;

  const parsed = useMemo(() => {
    if (!detailsOpen || !api || !chain) return null;
    const call = transactionService.createCallFromCallData(template.callData as CallData, api);
    if (!call) return null;
    return transactionService.formatCall(call, chain);
  }, [detailsOpen, api, chain, template.callData]);

  const handleDelete = () => {
    const snapshot = {
      name: template.name,
      chainId: template.chainId,
      callData: template.callData,
      specVersion: template.specVersion,
    };
    toast.success(t('operationTemplates.toastRemoved'), {
      action: {
        label: t('operationTemplates.undo'),
        onClick: () => {
          void save(snapshot);
        },
      },
    });
    void remove(template);
  };

  return (
    <>
      <div
        className={cnTw(
          'grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 rounded-md p-3 transition-colors',
          disabled ? 'opacity-50' : 'hover:bg-action-background-hover',
        )}
      >
        <div className="min-w-0">
          <BodyText className="truncate">{template.name}</BodyText>
          <ChainTitle chainId={template.chainId} iconSize={12} fontClass="text-caption" />
        </div>

        <div className="flex items-center gap-x-1">
          {isStale && (
            <Tooltip>
              <Tooltip.Trigger>
                <div tabIndex={0}>
                  <Icon name="warnCutout" size={16} className="text-text-warning" />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('operationTemplates.staleTooltip')}</Tooltip.Content>
            </Tooltip>
          )}

          {!disabled && (
            <RenameTemplateModal template={template}>
              <IconButton name="edit" size={16} ariaLabel={t('operationTemplates.renameHint')} />
            </RenameTemplateModal>
          )}

          {!disabled && (
            <IconButton name="delete" size={16} ariaLabel={t('operationTemplates.delete')} onClick={handleDelete} />
          )}
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-2">
          {disabled ? (
            <span title={t('operationTemplates.crossChainDisabled')}>
              <Button size="sm" pallet="primary" disabled>
                {t('operationTemplates.apply')}
              </Button>
            </span>
          ) : (
            onApply && (
              <Button size="sm" pallet="primary" onClick={() => onApply(template)}>
                {t('operationTemplates.apply')}
              </Button>
            )
          )}
          <Button size="sm" pallet="secondary" onClick={() => setDetailsOpen(true)}>
            {t('operationTemplates.viewDetails')}
          </Button>
          <Copy value={template.callData} notification={t('operationTemplates.toastCallDataCopied')}>
            <button
              type="button"
              className="ms-auto flex items-center gap-x-1 text-caption text-text-tertiary hover:text-text-primary"
            >
              <Icon name="copy" size={12} />
              {t('operationTemplates.copyCallData')}
            </button>
          </Copy>
        </div>
      </div>

      <Modal isOpen={detailsOpen} size="md" height="fit" onToggle={setDetailsOpen}>
        <Modal.Title close>{t('callData.confirmation.fields.details.label')}</Modal.Title>
        <Modal.Content>
          <Box padding={5} gap={3} direction="column">
            <SmallTitleText>{template.name}</SmallTitleText>
            {nonNullable(parsed) ? (
              <JsonArgs value={parsed} />
            ) : (
              <FootnoteText className="text-text-tertiary">{t('operationTemplates.parseFailed')}</FootnoteText>
            )}
          </Box>
        </Modal.Content>
      </Modal>
    </>
  );
};
