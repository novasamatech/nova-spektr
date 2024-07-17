import { BaseModal } from '@shared/ui';
import { useI18n } from '@app/providers';
import { type Validator } from '@shared/core/types/validator';
import { ValidatorsTable } from '@entities/staking/ui';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  onClose: () => void;
};

export const SelectedValidatorsModal = ({ isOpen, validators, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 pt-2"
      panelClass="w-[368px] max-h-[660px] overflow-x-hidden"
      title={t('staking.confirmation.validatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <section>
        <ul className="flex flex-col [overflow-y:overlay]">
          {validators.map((validator) => (
            <li
              key={validator.address}
              className="grid items-center pl-5 pr-2 shrink-0 h-10 grid-cols-[1fr,40px] hover:bg-hover group"
            >
              <ValidatorsTable.ShortRow validator={validator} />
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};
