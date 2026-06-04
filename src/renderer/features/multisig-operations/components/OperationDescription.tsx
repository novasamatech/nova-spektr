import { useUnit } from 'effector-react';
import { type ReactNode, useState } from 'react';
import { Trans } from 'react-i18next';
import { toast } from 'sonner';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { resolveDescriptionAreaState } from '@/shared/lib/operation-description/resolveDescriptionAreaState';
import { Button, DetailRow, FootnoteText } from '@/shared/ui';
import { Modal, TextArea } from '@/shared/ui-kit';
import {
  PERMISSIONS,
  descriptionSaveErrorMessage,
  operationDescriptionsResource,
  operationsService,
  useOperationDescription,
} from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { ReconnectAddressBookButton, backendContactsModel } from '@/features/contacts';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

const DESCRIPTION_PREVIEW_LENGTH = 40;
type DescriptionModalMode = 'add' | 'edit';

export const OperationDescription = ({ operation, chain }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const { authState, baseUrl, contacts, hasEverConnected, isHealthy } = useUnit({
    authState: authModel.$authState,
    baseUrl: backendConfigurationModel.$backendUrl,
    contacts: contactModel.$backendContacts,
    hasEverConnected: connectionHistoryModel.$hasEverConnected,
    isHealthy: backendContactsModel.$isHealthy,
  });

  const [modalMode, setModalMode] = useState<DescriptionModalMode | null>(null);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasWritePermission = authState?.permissions.includes(PERMISSIONS.OPERATION_WRITE) ?? false;
  const isInAddressBook = contacts.some(contact => contact.accountId === operation.multisigAccountId);
  const descriptionToSave = draft.trim();
  const canSave = Boolean(baseUrl) && descriptionToSave.length > 0 && !isSaving;
  const canEditDescription = Boolean(baseUrl) && isHealthy && hasWritePermission && isInAddressBook;

  const handleCancel = () => {
    setDraft('');
    setModalMode(null);
  };

  const handleModalToggle = (open: boolean) => {
    if (open) {
      const nextMode = description ? 'edit' : 'add';
      setDraft(description ?? '');
      setModalMode(nextMode);
    } else {
      handleCancel();
    }
  };

  const handleSave = async () => {
    if (!baseUrl || !modalMode || descriptionToSave.length === 0) return;

    setIsSaving(true);

    try {
      if (modalMode === 'edit') {
        await operationsService.updateDescription(baseUrl, operation.id, descriptionToSave);
      } else {
        await operationsService.createDescription(baseUrl, {
          multisigAccountId: operation.multisigAccountId,
          chainId: operation.chainId,
          callHash: operation.callHash,
          blockNumber: operation.blockCreated,
          extrinsicIndex: operation.indexCreated,
          description: descriptionToSave,
        });
      }

      operationDescriptionsResource.descriptionCreated({
        id: operation.id,
        description: descriptionToSave,
      });
      handleCancel();
    } catch (error) {
      const errorDescription = descriptionSaveErrorMessage(error, t);
      toast.error(t('operation.descriptionSaveError'), { description: errorDescription });
    } finally {
      setIsSaving(false);
    }
  };

  const renderDescriptionEditorModal = (trigger: ReactNode) => (
    <Modal size="mdlg" height="fit" isOpen={modalMode !== null} onToggle={handleModalToggle}>
      <Modal.Trigger>{trigger}</Modal.Trigger>
      <Modal.Title close>
        {modalMode === 'edit' ? t('operation.editDescriptionTitle') : t('operation.addDescriptionButton')}
      </Modal.Title>
      <Modal.Content>
        <div className="px-5 py-2">
          <TextArea
            value={draft}
            placeholder={t('operation.descriptionPlaceholder')}
            rows={8}
            maxLength={500}
            autoFocus
            onChange={setDraft}
          />
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button size="sm" variant="text" onClick={handleCancel}>
          {t('operation.cancelDescriptionButton')}
        </Button>
        <Button size="sm" disabled={!canSave} isLoading={isSaving} onClick={handleSave}>
          {t('operation.saveDescriptionButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  if (description) {
    const isLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
    const preview = isLongDescription
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
      : description;

    return (
      <DetailRow label={t('operation.descriptionLabel')}>
        <div className="flex min-w-0 items-center justify-end gap-x-3">
          <FootnoteText className="max-w-full truncate text-right text-text-secondary">{preview}</FootnoteText>
          {isLongDescription && (
            <Modal size="mdlg" height="fit">
              <Modal.Trigger>
                <Button size="sm" variant="text" className="shrink-0 p-0">
                  {t('operation.showDescriptionButton')}
                </Button>
              </Modal.Trigger>
              <Modal.Title close>{t('operation.descriptionLabel')}</Modal.Title>
              <Modal.Content>
                <div className="px-5 py-4">
                  <FootnoteText className="break-words whitespace-pre-wrap text-text-secondary">
                    {description}
                  </FootnoteText>
                </div>
              </Modal.Content>
            </Modal>
          )}
          {canEditDescription &&
            renderDescriptionEditorModal(
              <Button size="sm" variant="text" className="shrink-0 p-0">
                {t('operation.editDescriptionButton')}
              </Button>,
            )}
        </div>
      </DetailRow>
    );
  }

  const state = resolveDescriptionAreaState({
    isMultisig: true,
    isDraftActive: false,
    hasWritePermission,
    isHealthy,
    isInAddressBook,
    hasEverConnected,
  });

  if (state === 'hidden') return null;

  if (state === 'error') {
    return (
      <DetailRow label={t('operation.descriptionLabel')} wrapperClassName="items-start">
        <div className="flex w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-alert-border-negative bg-alert-background-negative p-3 text-footnote text-text-primary">
          <Trans
            t={t}
            i18nKey="operation.descriptionMultisigNotInBook"
            components={{
              account: (
                <NamedAccount accountId={operation.multisigAccountId} chain={chain} variant="short" hideExplorers />
              ),
            }}
          />
        </div>
      </DetailRow>
    );
  }

  if (state === 'reconnect') {
    return (
      <DetailRow label={t('operation.descriptionLabel')}>
        <ReconnectAddressBookButton
          size="sm"
          variant="text"
          iconSize={14}
          label={t('addressBook.auth.reconnectButton')}
          className="shrink-0 gap-x-1 p-0"
        />
      </DetailRow>
    );
  }

  return (
    <DetailRow label={t('operation.descriptionLabel')}>
      {renderDescriptionEditorModal(
        <Button size="sm" variant="text" className="p-0">
          {t('operation.addDescriptionButton')}
        </Button>,
      )}
    </DetailRow>
  );
};
