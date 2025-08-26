import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { evidenceForm } from '../model/evidenceForm';
import { evidencePost } from '../model/evidencePost';

import { EvidenceFormModal } from './EvidenceFormModal';
import { EvidencePostModal } from './EvidencePostModal';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
}>;

export const EvidencePostFlowModal = ({ wish, children }: Props) => {
  const step = useUnit(evidencePost.$step);
  const evidence = useUnit(evidenceForm.$evidence);

  const toggleForm = (open: boolean) => {
    evidencePost.setStep(open ? 'form' : 'closed');
  };

  const toggleConfirm = (open: boolean, done: boolean) => {
    if (!open && step === 'submit') {
      evidencePost.setStep(done ? 'closed' : 'form');
    }
  };

  return (
    <>
      <EvidenceFormModal wish={wish} isOpen={step !== 'closed'} onToggle={toggleForm}>
        {children}
      </EvidenceFormModal>
      {nonNullable(evidence) ? (
        <EvidencePostModal wish={wish} evidence={evidence} isOpen={step === 'submit'} onToggle={toggleConfirm} />
      ) : null}
    </>
  );
};
