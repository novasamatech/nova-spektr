import { ValidatorsTable } from '@renderer/components/common';
import { BaseModal } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Validator } from '@renderer/domain/validator';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onClose: () => void;
};

const ValidatorsModal = ({ isOpen, validators, asset, explorers, addressPrefix, onClose }: Props) => (
  <BaseModal
    closeButton
    contentClass="w-[470px] mt-7 pb-5 px-5"
    title="Your validators"
    isOpen={isOpen}
    onClose={onClose}
  >
    <ValidatorsTable
      showHeader={false}
      validators={validators}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
    />
  </BaseModal>
);

export default ValidatorsModal;
