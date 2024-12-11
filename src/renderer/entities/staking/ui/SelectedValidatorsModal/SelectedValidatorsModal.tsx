import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BaseModal } from '@/shared/ui';
// eslint-disable-next-line boundaries/element-types
import { type AccountIdentity } from '@/domains/identity';
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
    <BaseModal
      closeButton
      contentClass="pb-3 pt-2"
      panelClass="w-modal-sm max-h-[660px] overflow-x-hidden"
      title={t('staking.confirmation.validatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <section>
        <ul className="flex flex-col [overflow-y:overlay]">
          {validators.map((validator) => (
            <li
              key={validator.address}
              className="group grid h-10 shrink-0 grid-cols-[1fr,40px] items-center pl-5 pr-2 hover:bg-hover"
            >
              <ValidatorsTable.ShortRow
                validator={validator}
                identity={identities[toAccountId(validator.address) as AccountId]}
              />
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};
