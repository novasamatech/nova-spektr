import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { evidenceForm } from '../model/evidenceForm';

import { EvidenceFormModal } from './EvidenceFormModal';
import { EvidencePostModal } from './EvidencePostModal';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
}>;

export const EvidencePostFlowModal = ({ wish, children }: Props) => {
  const step = useUnit(evidenceForm.$step);

  return (
    <>
      <EvidenceFormModal wish={wish}>{children}</EvidenceFormModal>
      <EvidencePostModal
        wish={wish}
        isOpen={step === 'submit'}
        onToggle={open => {
          if (!open) {
            evidenceForm.setStep('form');
          }
        }}
      />
    </>
  );
};
