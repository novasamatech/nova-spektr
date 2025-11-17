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
  const evidence = useUnit(evidenceForm.$evidence);

  const toggleForm = useCallback(
    (open: boolean) => {
      evidencePost.setStep(open ? 'form' : 'closed');
    },
    [evidencePost],
  );

  const toggleConfirm = useCallback(
    (open: boolean, done: boolean) => {
      if (!open && step === 'submit') {
        evidencePost.setStep(done ? 'closed' : 'form');
      }
    },
    [step, evidencePost],
  );

  return (
    <>
      <SubmitEvidenceFromScratch wish={wish} isOpen={step === 'form'} onToggle={toggleForm}>
        {children}
      </SubmitEvidenceFromScratch>
      {nonNullable(evidence) && (
        <EvidencePostModal wish={wish} evidence={evidence} isOpen={step === 'submit'} onToggle={toggleConfirm} />
      )}
    </>
  );
};
