import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nullable } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { SignatorySelectModal } from '@/features/multisig-operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { convertToFlexibleModel } from '../model/convert-to-flexible-model';

import { ConvertToFlexibleConfirm } from './ConvertToFlexibleConfirm';

export const ConvertRegularToFlexible = () => {
  const { t } = useI18n();

  const step = useUnit(convertToFlexibleModel.$step);
  const chain = useUnit(convertToFlexibleModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), convertToFlexibleModel.flow.close);

  if (!chain) return null;

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  return (
    <>
      <Modal size="md" height="fit" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close>
          <OperationTitle title={t('operations.modalTitles.convertToFlexible')} chainId={chain.chainId} />
        </Modal.Title>
        <Modal.Content>
          {isStep(step, Step.CONFIRM) && <ConvertToFlexibleConfirm />}
          {isStep(step, Step.SIGN) && (
            <OperationSign onGoBack={() => convertToFlexibleModel.stepChanged(Step.CONFIRM)} />
          )}
        </Modal.Content>
      </Modal>

      <MultisigSignatorySelectModal isOpen={isModalOpen} onCancel={closeModal} />
    </>
  );
};

type SignatoryParams = {
  isOpen: boolean;
  onCancel: () => void;
};

const MultisigSignatorySelectModal = ({ isOpen, onCancel }: SignatoryParams) => {
  const chain = useUnit(convertToFlexibleModel.$chain);
  const selectedSignatory = useUnit(convertToFlexibleModel.$selectedSignatory);
  const signatories = useUnit(convertToFlexibleModel.$signatories);

  const shouldPickSignatory = isOpen && nullable(selectedSignatory) && signatories.length > 1;
  const [isSelectSignatoryOpen, setIsSelectSignatoryOpen] = useState(shouldPickSignatory);

  useEffect(() => {
    setIsSelectSignatoryOpen(shouldPickSignatory);
  }, [isOpen]);

  if (!chain || !signatories || !chain.assets.at(0)) return null;

  const handleSelectSignatoryClose = () => {
    setIsSelectSignatoryOpen(false);
    onCancel();
  };

  return (
    <SignatorySelectModal
      isOpen={isSelectSignatoryOpen}
      accounts={signatories}
      chain={chain}
      nativeAsset={chain.assets.at(0)!}
      onClose={handleSelectSignatoryClose}
      onSelect={(a) => {
        convertToFlexibleModel.selectSigner(a);
        setIsSelectSignatoryOpen(false);
      }}
    />
  );
};
