import { ValidatorsTable } from '@renderer/components/common';
import { BaseModal } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
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

const ValidatorsModal = ({ isOpen, validators, asset, explorers, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="w-[470px] mt-7 pb-5 px-5"
      title={t('staking.confirmation.yourValidators')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="overflow-y-auto max-h-[600px]">
        <ValidatorsTable
          showHeader={false}
          validators={validators}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      </div>
    </BaseModal>
  );
};

export default ValidatorsModal;
