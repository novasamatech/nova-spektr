import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { Modal } from '@/shared/ui-kit';
import { type AccountIdentity } from '@/domains/network';
import { ValidatorsTable } from '../ValidatorsTable/ValidatorsTable';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  identities: Record<AccountId, AccountIdentity>;
  onClose: () => void;
};

export const SelectedValidatorsModal = ({ isOpen, validators, identities, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={onClose}>
      <Modal.Title close>{t('staking.confirmation.validatorsTitle')}</Modal.Title>
      <Modal.Content>
        <ul className="flex flex-col [overflow-y:overlay]">
          {validators.map((validator) => {
            const identity = identities[toAccountId(validator.address)];
            if (nullable(identity)) return null;

            return (
              <li
                key={validator.address}
                className="group hover:bg-hover grid h-10 shrink-0 grid-cols-[1fr_40px] items-center pr-2 pl-5"
              >
                <ValidatorsTable.ShortRow validator={validator} identity={identity} />
              </li>
            );
          })}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
