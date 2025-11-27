import { useEffect, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { Field, Input, InputFile, Modal, StepIndicator } from '@/shared/ui-kit';
import { evidenceForm } from '../model/evidenceForm';
import { evidenceIPFS } from '../model/evidenceIPFS';

type Props = {
  isOpen: boolean;
  onToggle(open: boolean): void;
  wish: 'Promotion' | 'Retention';
};

export const IPFSUploadModal = ({ isOpen, onToggle, wish }: Props) => {
  useFlow(evidenceForm.flow, { wish });

  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Key to force InputFile remount when clearing is needed (resets internal fileName state)
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileChange = (file: File | null) => {
    setFile(file);
    if (file) {
      setHash('');
      setShowValidationError(false);
      setFetchError(null);
    }
  };

  const handleButtonSubmit = async () => {
    const hasHash = hash.trim().length > 0;
    const hasFile = file !== null;

    if (!hasHash && !hasFile) {
      setShowValidationError(true);
      return;
    }

    setShowValidationError(false);
    setFetchError(null);
    setIsValidating(true);

    try {
      if (file) {
        const content = await file.text();
        evidenceIPFS.setPendingData({ type: 'file', file, content });
      } else {
        const result = await evidenceIPFS.fetchIPFSContent({ hash });
        evidenceIPFS.setPendingData({ type: 'hash', hash, content: result.content });
      }
    } catch {
      setFetchError(t('fellowship.salary.evidenceForm.fetchError'));
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setShowValidationError(false);
      setFetchError(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleButtonSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hash, file]);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setHash('');
      setShowValidationError(false);
      setFetchError(null);
      setFileInputKey(prev => prev + 1);
    }
  }, [isOpen]);

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null);
      setHash('');
      setShowValidationError(false);
      setFetchError(null);
      evidenceIPFS.reset();
    }
    onToggle(open);
  };

  const title =
    wish === 'Promotion'
      ? t('fellowship.salary.evidence.submitPromotionReport')
      : t('fellowship.salary.evidence.submitRetentionReport');

  return (
    <Modal size="lg" height="full" isOpen={isOpen} onToggle={handleClose}>
      <Modal.Title close>{title}</Modal.Title>

      <Modal.Content disableScroll>
        <div className="flex h-full flex-col px-5 pb-5">
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0">
              <Field text={t('fellowship.salary.evidence.ipfsUpload.hashLabel')}>
                <Input
                  name="evidence"
                  placeholder={t('fellowship.salary.evidence.ipfsUpload.hashPlaceholder')}
                  value={hash}
                  invalid={showValidationError || !!fetchError}
                  width="full"
                  onChange={value => {
                    setHash(value);
                    if (file) {
                      setFile(null);
                      setFileInputKey(prev => prev + 1);
                    }
                    setShowValidationError(false);
                    setFetchError(null);
                  }}
                />
                {showValidationError && (
                  <InputHint variant="error" active={true}>
                    {t('fellowship.salary.evidence.ipfsUpload.validationError')}
                  </InputHint>
                )}
                {fetchError && (
                  <InputHint variant="error" active={true}>
                    {fetchError}
                  </InputHint>
                )}
              </Field>
            </div>

            <div className="mt-2 flex-shrink-0">
              <span className="text-footnote font-medium text-text-tertiary">{t('fellowship.salary.evidence.or')}</span>
            </div>

            <div className="mt-2 min-h-0 flex-1">
              <InputFile
                key={fileInputKey}
                accept=".md"
                placeholder={t('fellowship.salary.evidence.ipfsUpload.dragDropFile')}
                invalid={showValidationError}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <div className="relative flex w-full items-center justify-end">
          <div className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator
              steps={[
                {
                  label: t('fellowship.salary.evidence.ipfsUpload.step1'),
                  isActive: true,
                  isCompleted: false,
                },
                {
                  label: t('fellowship.salary.evidence.ipfsUpload.step2'),
                  isActive: false,
                  isCompleted: false,
                },
              ]}
            />
          </div>
          <Button
            size="md"
            variant="fill"
            pallet="primary"
            disabled={isValidating || showValidationError || !!fetchError}
            onClick={handleButtonSubmit}
          >
            {isValidating
              ? t('fellowship.salary.evidence.validating')
              : `⌘↵ ${t('fellowship.salary.evidence.continue')}`}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
