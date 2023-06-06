import { BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { Validator } from '@renderer/domain/validator';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  explorers?: Explorer[];
  onClose: () => void;
};

const ValidatorsModal = ({ isOpen, validators, explorers, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 px-3 pt-2"
      panelClass="w-[368px]"
      title={t('staking.confirmation.validatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ul className="max-h-[600px] flex flex-col gap-y-3">
        {validators.map((validator) => (
          <li key={validator.address}>
            <AddressWithExplorers
              address={validator.address}
              size={20}
              explorers={explorers}
              addressFont="text-body text-text-secondary"
              type="short"
              className="gap-x-1"
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};

export default ValidatorsModal;
