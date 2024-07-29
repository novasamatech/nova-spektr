import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

import { MultisigWallet } from './MultisigWallet';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

// const enum Step {
//   SELECT_WALLET_TYPE,
//   CREATE_WALLET,
// }

export const MultisigWalletWizard = ({ isOpen, onClose, onComplete }: Props) => {
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  // const [step, setStep] = useState(Step.CREATE_WALLET);
  // const [walletType, setWalletType] = useState<MultisigWalletType>(MultisigWalletType.SINGLE_CHAIN);

  // const selectWalletType = (type: MultisigWalletType) => {
  //   setWalletType(type);

  //   setStep(Step.CREATE_WALLET);
  // };

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

      <MultisigWallet
        isOpen={
          isModalOpen
          // && step === Step.CREATE_WALLET
          // && walletType === MultisigWalletType.SINGLE_CHAIN
        }
        onClose={closeMultisigModal}
        onComplete={onComplete}
        // onBack={goBack}
      />

      {/* <MultiChainMultisigWallet
        isOpen={isModalOpen && step === Step.CREATE_WALLET && walletType === MultisigWalletType.MULTI_CHAIN}
        onClose={closeMultisigModal}
        onComplete={onComplete}
        onBack={goBack}
      /> */}
    </>
  );
};
