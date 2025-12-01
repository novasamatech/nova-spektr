import { useGate, useUnit } from 'effector-react';
import { useCallback } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { evidenceForm } from '../model/evidenceForm';
import { evidencePost } from '../model/evidencePost';

import { EvidencePostModal } from './EvidencePostModal';
import { SubmitEvidenceFromScratch } from './SubmitEvidenceFromScratch';

export const EvidencePostFlowModal = () => {
  const step = useUnit(evidencePost.$step);
  const activeWish = useUnit(evidencePost.$activeWish);
  const evidence = useUnit(evidenceForm.$evidence);

  const shouldShowForm = step === 'form' && nonNullable(activeWish);
  const shouldShowSubmit = step === 'submit' && nonNullable(activeWish) && nonNullable(evidence);

  useGate(evidenceForm.flow, { wish: activeWish });

  const toggleForm = useCallback((open: boolean) => {
    if (open) {
      evidenceForm.setFlowType('fromScratch');
      evidencePost.setStep('form');
    } else {
      evidencePost.setStep('closed');
      evidencePost.setActiveWish(null);
      evidenceForm.setFlowType(null);
      evidenceForm.flow.close({ wish: null });
    }
  }, []);

  const toggleConfirm = useCallback(
    (open: boolean, done: boolean) => {
      if (!open && step === 'submit') {
        evidencePost.setStep(done ? 'closed' : 'form');
        if (done) {
          evidencePost.setActiveWish(null);
          evidenceForm.setFlowType(null);
          evidenceForm.reset();
          evidenceForm.flow.close({ wish: null });
        }
      }
    },
    [step],
  );

  if (!activeWish) {
    return null;
  }

  return (
    <>
      {shouldShowForm && <SubmitEvidenceFromScratch wish={activeWish} isOpen={true} onToggle={toggleForm} />}
      {shouldShowSubmit && (
        <EvidencePostModal wish={activeWish} evidence={evidence!} isOpen={true} onToggle={toggleConfirm} />
      )}
    </>
  );
};
