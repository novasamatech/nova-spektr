import { BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { Validator } from '@renderer/domain/validator';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import { getComposedIdentity } from '@renderer/shared/utils/strings';
import cnTw from '@renderer/shared/utils/twMerge';

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
      panelClass="w-[480px]"
      title={t('staking.confirmation.validatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ul className={cnTw('flex flex-col gap-y-3', validators.length > 7 && 'max-h-[388px] overflow-y-auto')}>
        {validators.map((validator) => (
          <li key={validator.address}>
            <AddressWithExplorers
              className="gap-x-1"
              name={getComposedIdentity(validator.identity)}
              addressFont="text-body text-text-secondary"
              type="full"
              size={16}
              address={validator.address}
              explorers={explorers}
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};

export default ValidatorsModal;
