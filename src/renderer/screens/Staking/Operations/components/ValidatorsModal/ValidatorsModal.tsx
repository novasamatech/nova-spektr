import { BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Validator } from '@renderer/domain/validator';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';

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
      contentClass="pb-3 px-3 pt-2"
      panelClass="w-[368px]"
      title={t('staking.confirmation.yourValidators')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="overflow-y-auto max-h-[600px] flex flex-col gap-y-3">
        {validators.map((validator) => (
          <AddressWithExplorers
            key={validator.address}
            address={validator.address}
            size={20}
            explorers={explorers}
            addressFont="text-body text-text-secondary"
            type="short"
            className="!gap-x-1"
          />
        ))}
      </div>
    </BaseModal>
  );
};

export default ValidatorsModal;
