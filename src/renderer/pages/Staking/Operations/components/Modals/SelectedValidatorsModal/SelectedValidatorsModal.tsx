import { Accordion, BaseModal } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Validator } from '@renderer/shared/core/types/validator';
import type { Explorer } from '@renderer/shared/core';
import { ValidatorsTable } from '@renderer/entities/staking/ui';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  explorers?: Explorer[];
  onClose: () => void;
};

export const SelectedValidatorsModal = ({ isOpen, validators, explorers, onClose }: Props) => {
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
      <Accordion isDefaultOpen className="mt-2">
        <Accordion.Content>
          <ul className="flex flex-col [overflow-y:overlay]">
            {validators.map((validator) => (
              <li
                key={validator.address}
                className="grid items-center pl-5 pr-2 shrink-0 h-10 grid-cols-[1fr,40px] hover:bg-hover group"
              >
                <ValidatorsTable.ShortRow validator={validator} explorers={explorers} />
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </BaseModal>
  );
};
