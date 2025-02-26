import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { evidenceForm } from '../model/evidenceForm';

import { EvidenceFormModal } from './EvidenceFormModal';
import { EvidencePostModal } from './EvidencePostModal';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
}>;

export const EvidencePostFlowModal = ({ wish, children }: Props) => {
  const step = useUnit(evidenceForm.$step);
  const evidence = useUnit(evidenceForm.$evidence);

  return (
    <>
      <EvidenceFormModal wish={wish}>{children}</EvidenceFormModal>
      {nonNullable(evidence) ? (
        <EvidencePostModal
          wish={wish}
          evidence={evidence}
          isOpen={step === 'submit'}
          onToggle={open => {
            if (!open) {
              evidenceForm.setStep('form');
            }
          }}
        />
      ) : null}
    </>
  );
};
