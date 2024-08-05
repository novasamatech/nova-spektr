import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

import { MultisigWallet } from './MultisigWallet';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultisigWalletWizard = ({ isOpen, onClose, onComplete }: Props) => {
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const closeMultisigModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  // const goBack = () => {
  //   setWalletType(undefined);
  //   setStep(Step.SELECT_WALLET_TYPE);
  // };

  return (
    <>
      {/* <SelectMultisigWalletType
        isOpen={isModalOpen && step === Step.SELECT_WALLET_TYPE}
        onClose={closeMultisigModal}
        onContinue={selectWalletType}
      /> */}

      <MultisigWallet isOpen={isModalOpen} onClose={closeMultisigModal} />
    </>
  );
};
