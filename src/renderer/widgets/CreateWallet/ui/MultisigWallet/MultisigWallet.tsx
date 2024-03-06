import { useState } from 'react';

import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { SelectMultisigWalletType } from './SelectMultisigWalletType';
import { MultisigWalletType } from './common/constants';
import { SingleChainMultisigWallet } from './SingleChainMultisigWallet';
import { MultiChainMultisigWallet } from './MultiChainMultisigWallet';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const enum Step {
  SELECT_WALLET_TYPE,
  CREATE_WALLET,
}

export const MultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [step, setStep] = useState(Step.SELECT_WALLET_TYPE);
  const [walletType, setWalletType] = useState<MultisigWalletType>();

  const selectWalletType = (type: MultisigWalletType) => {
    setWalletType(type);

    setStep(Step.CREATE_WALLET);
  };

  const closeMultisigModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  const goBack = () => {
    setWalletType(undefined);
    setStep(Step.SELECT_WALLET_TYPE);
  };

  return (
    <>
      <SelectMultisigWalletType
        isOpen={isModalOpen && step === Step.SELECT_WALLET_TYPE}
        onClose={closeMultisigModal}
        onContinue={selectWalletType}
      />

      <SingleChainMultisigWallet
        isOpen={isModalOpen && step === Step.CREATE_WALLET && walletType === MultisigWalletType.SINGLE_CHAIN}
        onClose={closeMultisigModal}
        onComplete={onComplete}
        onBack={goBack}
      />

      <MultiChainMultisigWallet
        isOpen={isModalOpen && step === Step.CREATE_WALLET && walletType === MultisigWalletType.MULTI_CHAIN}
        onClose={closeMultisigModal}
        onComplete={onComplete}
        onBack={goBack}
      />
    </>
  );
};
