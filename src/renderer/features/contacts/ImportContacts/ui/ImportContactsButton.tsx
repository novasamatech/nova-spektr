import { useUnit } from 'effector-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon, InfoLink } from '@/shared/ui';
import { Tooltip, useNotification } from '@/shared/ui-kit';
import { importContactsModel } from '../model/import-contacts-model';

import { ImportConflictsModal } from './ImportConflictsModal';

const LOADING_TOAST_DELAY = 500;

const LINK = 'https://docs.novaspektr.io/address-book/import';

export const ImportContactsButton = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingToastId, setLoadingToastId] = useState<string | number | undefined>();
  const [hasShownSuccess, setHasShownSuccess] = useState(false);

  const isLoading = useUnit(importContactsModel.$isLoading);
  const hasError = useUnit(importContactsModel.$hasError);
  const hasSuccess = useUnit(importContactsModel.$hasSuccess);
  const showConflicts = useUnit(importContactsModel.$showConflicts);
  const isEmptyList = useUnit(importContactsModel.$isEmptyList);
  const isFileTooLarge = useUnit(importContactsModel.$isFileTooLarge);
  const importedCount = useUnit(importContactsModel.$importedCount);

  useEffect(() => {
    if (isLoading) {
      setHasShownSuccess(false);

      const timeoutId = setTimeout(() => {
        const toastId = toast.loading(t('addressBook.importContacts.loading'));
        setLoadingToastId(toastId);
      }, LOADING_TOAST_DELAY);

      return () => clearTimeout(timeoutId);
    }

    if (loadingToastId) {
      toast.dismiss(loadingToastId);
      setLoadingToastId(undefined);
    }
  }, [isLoading, toast, t, loadingToastId]);

  useEffect(() => {
    if (!hasError) return;

    const description = isFileTooLarge ? (
      t('addressBook.importContacts.errors.fileTooLarge')
    ) : isEmptyList ? (
      t('addressBook.importContacts.errors.emptyList')
    ) : (
      <div className="flex flex-col gap-2">
        <span>{t('addressBook.importContacts.errors.description')}</span>

        <InfoLink withLinkIcon url="https://docs.novaspektr.io/address-book/import">
          {t('addressBook.importContacts.wikiLink')}
        </InfoLink>
      </div>
    );

    toast.error(t('addressBook.importContacts.errors.title'), { description });
    importContactsModel.events.resetState();
  }, [hasError, isFileTooLarge, isEmptyList, toast, t]);

  useEffect(() => {
    if (hasSuccess && !hasShownSuccess) {
      setHasShownSuccess(true);

      if (importedCount > 0) {
        toast.success(t('addressBook.importContacts.success'));
      }

      importContactsModel.events.resetState();
    }
  }, [hasSuccess, hasShownSuccess, importedCount, toast, t]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importContactsModel.events.fileSelected(file);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  const handleCloseDialog = () => {
    importContactsModel.events.closeModal();
  };

  return (
    <>
      <Tooltip enableHover delay={200}>
        <Tooltip.Trigger>
          <Button
            size="sm"
            prefixElement={<Icon name="import" size={16} className="text-inherit" />}
            disabled={isLoading}
            onClick={handleButtonClick}
          >
            {t('addressBook.importContacts.button')}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div className="flex flex-col gap-1">
            <span>{t('addressBook.importContacts.tooltip')}</span>
            <a
              href={LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 underline hover:text-gray-200"
            >
              {t('addressBook.importContacts.wikiLink')}
              <Icon name="link" size={12} className="text-inherit" />
            </a>
          </div>
        </Tooltip.Content>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label={t('addressBook.importContacts.button')}
        disabled={isLoading}
        onChange={handleFileChange}
      />

      {showConflicts && <ImportConflictsModal onClose={handleCloseDialog} />}
    </>
  );
};
