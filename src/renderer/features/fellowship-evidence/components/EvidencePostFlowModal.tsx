import { useUnit } from 'effector-react';
import { type PropsWithChildren, useCallback } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { evidenceForm } from '../model/evidenceForm';
import { evidencePost } from '../model/evidencePost';

import { EvidencePostModal } from './EvidencePostModal';
import { SubmitEvidenceFromScratch } from './SubmitEvidenceFromScratch';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
}>;

export const EvidencePostFlowModal = ({ wish, children }: Props) => {
  const step = useUnit(evidencePost.$step);
  const activeWish = useUnit(evidencePost.$activeWish);
  const evidence = useUnit(evidenceForm.$evidence);

  const shouldShowForm = step === 'form' && activeWish === wish;
  const shouldShowSubmit = step === 'submit' && activeWish === wish;

  const toggleForm = useCallback(
    (open: boolean) => {
      if (open) {
        evidenceForm.setFlowType('fromScratch');
        evidencePost.setActiveWish(wish);
        evidencePost.setStep('form');
      } else {
        evidencePost.setStep('closed');
        evidencePost.setActiveWish(null);
        evidenceForm.setFlowType(null);
      }
    },
    [wish],
  );

  const toggleConfirm = useCallback(
    (open: boolean, done: boolean) => {
      if (!open && step === 'submit') {
        evidencePost.setStep(done ? 'closed' : 'form');
        if (done) {
          evidencePost.setActiveWish(null);
          evidenceForm.setFlowType(null);
          evidenceForm.reset();
        }
      }
    },
    [step],
  );

  return (
    <>
      <SubmitEvidenceFromScratch wish={wish} isOpen={shouldShowForm} onToggle={toggleForm}>
        {children}
      </SubmitEvidenceFromScratch>
      {nonNullable(evidence) && (
        <EvidencePostModal wish={wish} evidence={evidence} isOpen={shouldShowSubmit} onToggle={toggleConfirm} />
      )}
    </>
  );
};
