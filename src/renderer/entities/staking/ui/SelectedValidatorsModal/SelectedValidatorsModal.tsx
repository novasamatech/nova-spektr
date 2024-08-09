import { useI18n } from '@app/providers';
import { type Validator } from '@shared/core/types/validator';
import { BaseModal } from '@shared/ui';
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
              className="group grid h-10 shrink-0 grid-cols-[1fr,40px] items-center pl-5 pr-2 hover:bg-hover"
            >
              <ValidatorsTable.ShortRow validator={validator} />
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};
