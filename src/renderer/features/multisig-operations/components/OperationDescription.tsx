import { useUnit } from 'effector-react';
import { useState } from 'react';
import { Trans } from 'react-i18next';
import { toast } from 'sonner';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { resolveDescriptionAreaState } from '@/shared/lib/operation-description/resolveDescriptionAreaState';
import { Button, DetailRow, FootnoteText } from '@/shared/ui';
import { Modal, TextArea } from '@/shared/ui-kit';
import {
  HttpError,
  PERMISSIONS,
  operationDescriptionsResource,
  operationsService,
  useOperationDescription,
} from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { AddressBookHealthOverlay, backendContactsModel } from '@/features/contacts';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

const DESCRIPTION_PREVIEW_LENGTH = 40;

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

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (description) {
    const isLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
    const preview = isLongDescription
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
      : description;

    return (
      <DetailRow label={t('operation.descriptionLabel')}>
        <div className="flex min-w-0 items-center justify-end gap-x-1">
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
        </div>
      </DetailRow>
    );
  }

  const hasWritePermission = authState?.permissions.includes(PERMISSIONS.OPERATION_WRITE) ?? false;
  const isInAddressBook = contacts.some(contact => contact.accountId === operation.multisigAccountId);
  const state = resolveDescriptionAreaState({
    isMultisig: true,
    isDraftActive: false,
    hasWritePermission,
    isHealthy,
    isInAddressBook,
    hasEverConnected,
  });

  if (state === 'hidden') return null;

  const descriptionToSave = draft.trim();
  const canSave = Boolean(baseUrl) && descriptionToSave.length > 0 && !isSaving;

  const handleCancel = () => {
    setDraft('');
    setIsAdding(false);
  };

  const handleModalToggle = (open: boolean) => {
    if (open) {
      setIsAdding(true);
    } else {
      handleCancel();
    }
  };

  const handleSave = async () => {
    if (!baseUrl || descriptionToSave.length === 0) return;

    setIsSaving(true);

    try {
      await operationsService.createDescription(baseUrl, {
        multisigAccountId: operation.multisigAccountId,
        chainId: operation.chainId,
        callHash: operation.callHash,
        blockNumber: operation.blockCreated,
        extrinsicIndex: operation.indexCreated,
        description: descriptionToSave,
      });

      operationDescriptionsResource.descriptionCreated({
        id: operation.id,
        description: descriptionToSave,
      });
      setDraft('');
      setIsAdding(false);
    } catch (error) {
      const errorDescription =
        error instanceof HttpError && error.status === 403
          ? t('addressBook.sources.errorForbidden')
          : error instanceof Error
            ? error.message
            : String(error);
      toast.error(t('operation.descriptionSaveError'), { description: errorDescription });
    } finally {
      setIsSaving(false);
    }
  };

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
      <DetailRow label={t('operation.descriptionLabel')} wrapperClassName="items-start">
        <AddressBookHealthOverlay isHealthy={false}>
          <TextArea
            value=""
            placeholder={t('operation.descriptionPlaceholder')}
            rows={2}
            maxLength={500}
            disabled
            onChange={() => {}}
          />
        </AddressBookHealthOverlay>
      </DetailRow>
    );
  }

  return (
    <DetailRow label={t('operation.descriptionLabel')}>
      <Modal size="mdlg" height="fit" isOpen={isAdding} onToggle={handleModalToggle}>
        <Modal.Trigger>
          <Button size="sm" variant="text" className="p-0">
            {t('operation.addDescriptionButton')}
          </Button>
        </Modal.Trigger>
        <Modal.Title close>{t('operation.addDescriptionButton')}</Modal.Title>
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
    </DetailRow>
  );
};
