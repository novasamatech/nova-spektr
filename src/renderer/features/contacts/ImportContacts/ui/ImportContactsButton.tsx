import { useUnit } from 'effector-react';
import { useEffect, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon, InfoLink } from '@/shared/ui';
import { useNotification } from '@/shared/ui-kit';
import { importContactsModel } from '../model/import-contacts-model';

import { ImportConflictsModal } from './ImportConflictsModal';

export const ImportContactsButton = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const successShownRef = useRef<boolean>(false);

  const importState = useUnit(importContactsModel.$importState);
  const isEmptyList = useUnit(importContactsModel.$isEmptyList);
  const importedCount = useUnit(importContactsModel.$importedCount);

  const hasConflicts = importState === 'conflicts';

  // Handle toast notifications for loading/success/error states
  useEffect(() => {
    // Show loading toast with 500ms delay
    if (importState === 'loading' && !toastIdRef.current && !loadingTimeoutRef.current) {
      // Reset success flag when starting new import
      successShownRef.current = false;

      loadingTimeoutRef.current = setTimeout(() => {
        toastIdRef.current = toast.loading(t('addressBook.importContacts.loading'));
        loadingTimeoutRef.current = undefined;
      }, 500);
      return;
    }

    // Dismiss loading toast if state changed from loading
    if (importState !== 'loading') {
      // Clear timeout if still pending
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }

      // Dismiss toast if it was shown
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
    }

    // Handle error state
    if (importState === 'error') {
      const description = isEmptyList ? (
        t('addressBook.importContacts.errors.emptyList')
      ) : (
        <div className="flex flex-col gap-2">
          <span>{t('addressBook.importContacts.errors.description')}</span>

          <InfoLink withLinkIcon url="https://docs.novaspektr.io/address-book/import">
            {t('addressBook.importContacts.errors.wikiLink')}
          </InfoLink>
        </div>
      );

      toast.error(t('addressBook.importContacts.errors.title'), { description });
      importContactsModel.events.resetState();
    }

    // Handle success state - only show once per import
    if (importState === 'success' && !successShownRef.current) {
      successShownRef.current = true;
      // Only show success toast if contacts were actually imported
      if (importedCount > 0) {
        toast.success(t('addressBook.importContacts.success'));
      }
      // Reset state after showing success
      importContactsModel.events.resetState();
    }
  }, [importState, isEmptyList, importedCount, toast, t]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('addressBook.importContacts.errors.title'), {
          description: t('addressBook.importContacts.errors.fileTooLarge'),
        });
        event.target.value = '';
        return;
      }

      importContactsModel.events.fileSelected(file);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  const handleCloseDialog = () => {
    importContactsModel.events.closeModal();
  };

  const isProcessing = importState === 'loading';

  return (
    <>
      <Button
        size="sm"
        prefixElement={<Icon name="import" size={16} className="text-inherit" />}
        disabled={isProcessing}
        onClick={handleButtonClick}
      >
        {t('addressBook.importContacts.button')}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label={t('addressBook.importContacts.button')}
        disabled={isProcessing}
        onChange={handleFileChange}
      />

      {hasConflicts && <ImportConflictsModal onClose={handleCloseDialog} />}
    </>
  );
};
