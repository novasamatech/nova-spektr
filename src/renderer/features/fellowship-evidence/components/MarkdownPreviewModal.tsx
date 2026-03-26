import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal, StepIndicator, useNotification } from '@/shared/ui-kit';
import { Markdown } from '@/shared/ui-kit/Markdown/Markdown';
import { evidenceForm } from '../model/evidenceForm';
import { evidenceIPFS } from '../model/evidenceIPFS';
import { evidencePost } from '../model/evidencePost';

type Props = PropsWithChildren<{
  isOpen: boolean;
  onToggle(open: boolean): void;
  wish: 'Promotion' | 'Retention';
  evidenceContent?: string;
  onBack?: () => void;
  flowType?: 'fromScratch' | 'ipfsUpload';
}>;

export const MarkdownPreviewModal = ({
  isOpen,
  onToggle,
  wish,
  evidenceContent,
  onBack,
  flowType = 'ipfsUpload',
  children,
}: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const isShowingToastRef = useRef(false);

  const isViewingSubmittedEvidence = nonNullable(evidenceContent);

  useGate(evidenceForm.flow, isViewingSubmittedEvidence ? { wish: null } : { wish });

  const ipfsFileContent = useUnit(evidenceIPFS.$fileContent);
  const pendingIPFSData = useUnit(evidenceIPFS.$pendingData);
  const isUploadPending = useUnit(evidenceIPFS.uploadFileToIPFS.pending);
  const uploadError = useUnit(evidenceIPFS.$uploadError);
  const activeWish = useUnit(evidenceForm.$wish);
  const activeFlowType = useUnit(evidenceForm.$flowType);

  const isLoading = isUploadPending;
  const contentToShow = evidenceContent || pendingIPFSData?.content || ipfsFileContent || '';
  const isActiveFlow = !isViewingSubmittedEvidence && isOpen && activeWish === wish && activeFlowType === flowType;

  useEffect(() => {
    if (!isActiveFlow) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
        isShowingToastRef.current = false;
      }
      return;
    }

    if (isUploadPending && !isShowingToastRef.current) {
      isShowingToastRef.current = true;
      toastIdRef.current = toast.loading(t('fellowship.salary.evidence.uploadingToIPFS'));
      return;
    }

    if (!isUploadPending && isShowingToastRef.current && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = undefined;
      isShowingToastRef.current = false;

      if (uploadError) {
        toast.error(uploadError);
      } else {
        toast.success(t('fellowship.salary.evidence.uploadSuccess'));
      }
    }
  }, [isUploadPending, uploadError, toast, t, isActiveFlow, wish, activeWish, flowType, activeFlowType]);

  const handleConfirm = () => {
    if (!isActiveFlow || !pendingIPFSData) {
      return;
    }

    if (pendingIPFSData.type === 'file' && pendingIPFSData.file) {
      evidenceIPFS.uploadFileToIPFS({ file: pendingIPFSData.file });
    } else if (pendingIPFSData.type === 'hash') {
      evidencePost.openSubmitModal();
    }
  };

  useEffect(() => {
    if (!isActiveFlow) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActiveFlow, handleConfirm]);

  const title =
    wish === 'Promotion'
      ? t('fellowship.salary.evidence.submitPromotionReport')
      : t('fellowship.salary.evidence.submitRetentionReport');

  return (
    <Modal size="lg" height="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>

      <Modal.Title close>{title}</Modal.Title>

      <Modal.Content>
        <div className="px-5">
          <Markdown>{contentToShow}</Markdown>
        </div>
      </Modal.Content>

      {!isViewingSubmittedEvidence && (
        <Modal.Footer>
          <div className="relative flex w-full items-center justify-between">
            <Button variant="text" onClick={onBack}>
              {t('general.button.backButton')}
            </Button>
            <div className="absolute left-1/2 -translate-x-1/2">
              <StepIndicator
                steps={[
                  {
                    label:
                      flowType === 'fromScratch'
                        ? t('fellowship.salary.evidence.fromScratch.step1')
                        : t('fellowship.salary.evidence.ipfsUpload.step1'),
                    isActive: false,
                    isCompleted: true,
                  },
                  {
                    label:
                      flowType === 'fromScratch'
                        ? t('fellowship.salary.evidence.fromScratch.step2')
                        : t('fellowship.salary.evidence.ipfsUpload.step2'),
                    isActive: true,
                    isCompleted: false,
                  },
                ]}
              />
            </div>
            <Button size="md" variant="fill" pallet="primary" disabled={isLoading} onClick={handleConfirm}>
              {`⌘↵ ${t('general.button.submitButton')}`}
            </Button>
          </div>
        </Modal.Footer>
      )}
      {isViewingSubmittedEvidence && (
        <Modal.Footer>
          <Button variant="text" onClick={() => onToggle(false)}>
            {t('fellowship.salary.evidence.preview.back')}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};
