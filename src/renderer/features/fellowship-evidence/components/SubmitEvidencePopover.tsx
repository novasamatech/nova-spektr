import { useUnit } from 'effector-react';
import { type PropsWithChildren, cloneElement, isValidElement, useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { evidenceForm } from '../model/evidenceForm';
import { evidenceIPFS } from '../model/evidenceIPFS';
import { evidencePost } from '../model/evidencePost';

import { EvidencePostModal } from './EvidencePostModal';
import { IPFSUploadModal } from './IPFSUploadModal';
import { MarkdownPreviewModal } from './MarkdownPreviewModal';
import { SubmitEvidenceFromScratch } from './SubmitEvidenceFromScratch';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
}>;

export const SubmitEvidencePopover = ({ wish, children }: Props) => {
  const { t } = useI18n();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fromScratchOpen, setFromScratchOpen] = useState(false);
  const [fromScratchSubmitOpen, setFromScratchSubmitOpen] = useState(false);

  const ipfsStep = useUnit(evidenceIPFS.$step);
  const submitModalOpen = useUnit(evidencePost.$submitModalOpen);
  const fromScratchEvidence = useUnit(evidenceForm.$evidence);
  const ipfsEvidence = useUnit(evidenceIPFS.$evidence);
  const flowType = useUnit(evidenceForm.$flowType);
  const activeWish = useUnit(evidenceForm.$wish);

  const shouldRenderUpload = ipfsStep === 'upload' && activeWish === wish;
  const shouldRenderPreview = ipfsStep === 'preview' && activeWish === wish;

  const handleFromScratch = useCallback(() => {
    evidenceForm.setFlowType('fromScratch');
    setFromScratchOpen(true);
    setPopoverOpen(false);
  }, []);

  const handleUploadFromIPFS = useCallback(() => {
    evidenceIPFS.reset();
    evidenceForm.flow.open({ wish });
    evidenceForm.setFlowType('ipfsUpload');
    evidenceIPFS.startFlow();
    setPopoverOpen(false);
  }, [wish]);

  const handleFromScratchClose = useCallback((open: boolean) => {
    setFromScratchOpen(open);
    if (!open) {
      evidenceForm.setFlowType(null);
      evidenceForm.reset();
    }
  }, []);

  useEffect(() => {
    if (nonNullable(fromScratchEvidence) && flowType === 'fromScratch' && fromScratchOpen) {
      setFromScratchOpen(false);
      setFromScratchSubmitOpen(true);
    }
  }, [fromScratchEvidence, flowType, fromScratchOpen]);

  const handleIPFSUploadClose = useCallback((open: boolean) => {
    if (!open) {
      evidenceIPFS.setStep('closed');
      evidenceIPFS.reset();
      evidenceForm.setFlowType(null);
    }
  }, []);

  const handleIPFSPreviewClose = useCallback((open: boolean) => {
    if (!open) {
      evidenceIPFS.setStep('closed');
      evidenceIPFS.reset();
      evidenceForm.setFlowType(null);
    }
  }, []);

  const handleBackToUpload = useCallback(() => {
    evidenceIPFS.setStep('upload');
    evidenceIPFS.setPendingData(null);
  }, []);

  const handleIPFSSubmitModalClose = useCallback((open: boolean, done: boolean) => {
    if (!open) {
      evidencePost.closeSubmitModal();
      if (done) {
        evidenceForm.setFlowType(null);
        evidenceForm.reset();
        evidenceIPFS.reset();
      }
    }
  }, []);

  const handleFromScratchSubmitClose = useCallback((open: boolean, done: boolean) => {
    setFromScratchSubmitOpen(open);
    if (!open && done) {
      evidenceForm.setFlowType(null);
      evidenceForm.reset();
    }
  }, []);

  const chevronIcon = <Icon name={popoverOpen ? 'up' : 'down'} size={16} className="text-white" />;

  const childWithIcon = isValidElement(children)
    ? cloneElement(children, { suffixElement: chevronIcon } as never)
    : children;

  return (
    <>
      <Popover dialog open={popoverOpen} onToggle={setPopoverOpen}>
        <Popover.Trigger>{childWithIcon}</Popover.Trigger>
        <Popover.Content>
          <Box padding={[1, 1]} gap={1}>
            <div
              className="cursor-pointer rounded px-3 py-2 hover:bg-action-background-hover"
              onClick={handleFromScratch}
            >
              <FootnoteText className="text-text-secondary">
                {t('fellowship.salary.evidence.submitOptions.fromScratch')}
              </FootnoteText>
            </div>
            <div
              className="cursor-pointer rounded px-3 py-2 hover:bg-action-background-hover"
              onClick={handleUploadFromIPFS}
            >
              <FootnoteText className="text-text-secondary">
                {t('fellowship.salary.evidence.submitOptions.uploadFromIPFS')}
              </FootnoteText>
            </div>
          </Box>
        </Popover.Content>
      </Popover>

      <SubmitEvidenceFromScratch wish={wish} isOpen={fromScratchOpen} onToggle={handleFromScratchClose} />

      {shouldRenderUpload && <IPFSUploadModal isOpen={true} wish={wish} onToggle={handleIPFSUploadClose} />}

      {shouldRenderPreview && (
        <MarkdownPreviewModal
          isOpen={true}
          wish={wish}
          flowType="ipfsUpload"
          onToggle={handleIPFSPreviewClose}
          onBack={handleBackToUpload}
        />
      )}

      {nonNullable(ipfsEvidence) && flowType === 'ipfsUpload' && activeWish === wish && (
        <EvidencePostModal
          wish={wish}
          evidence={ipfsEvidence}
          isOpen={submitModalOpen}
          onToggle={handleIPFSSubmitModalClose}
        />
      )}

      {nonNullable(fromScratchEvidence) && flowType === 'fromScratch' && activeWish === wish && (
        <EvidencePostModal
          wish={wish}
          evidence={fromScratchEvidence}
          isOpen={fromScratchSubmitOpen}
          onToggle={handleFromScratchSubmitClose}
        />
      )}
    </>
  );
};
