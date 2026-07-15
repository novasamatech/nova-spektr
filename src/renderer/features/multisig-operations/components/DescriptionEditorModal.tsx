import { useUnit } from 'effector-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal, TextArea } from '@/shared/ui-kit';
import {
  descriptionSaveErrorMessage,
  operationDescriptionsResource,
  operationsService,
  useOperationDescription,
} from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { backendConfigurationModel } from '@/aggregates/backend';

type Props = {
  operation: MultisigOperation;
  trigger: ReactNode;
};

type DescriptionModalMode = 'add' | 'edit';

/**
 * Add/edit modal for an operation's address-book description. Shared between
 * the row's inline description cell and the Details panel's description row.
 */
export const DescriptionEditorModal = ({ operation, trigger }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const baseUrl = useUnit(backendConfigurationModel.$backendUrl);

  const [modalMode, setModalMode] = useState<DescriptionModalMode | null>(null);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const descriptionToSave = draft.trim();
  const canSave = Boolean(baseUrl) && descriptionToSave.length > 0 && !isSaving;

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

  return (
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
};
