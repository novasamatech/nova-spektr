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
  <BaseModal closeButton title="Your validators" isOpen={isOpen} onClose={onClose}>
    <ValidatorsTable
      className="w-[470px] mt-7"
      showHeader={false}
      validators={validators}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
    />
  </BaseModal>
);

export default ValidatorsModal;
