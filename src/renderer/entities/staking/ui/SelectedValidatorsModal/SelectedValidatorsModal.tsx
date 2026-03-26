import { type Chain } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Modal } from '@/shared/ui-kit';
import { type AccountIdentity } from '@/domains/network';
// eslint-disable-next-line boundaries/element-types
import { ValidatorsTable } from '@/widgets/validators-table';

type Props = {
  isOpen: boolean;
  validators: Validator[];
  identities: Record<AccountId, AccountIdentity>;
  chain?: Chain;
  onClose: () => void;
};

export const SelectedValidatorsModal = ({ isOpen, validators, identities, chain, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={onClose}>
      <Modal.Title close>{t('staking.confirmation.validatorsTitle')}</Modal.Title>
      <Modal.Content>
        <ul className="flex flex-col [overflow-y:overlay]">
          {validators.map((validator) => {
            const identity = identities[validator.accountId];

            return (
              <li
                key={validator.accountId}
                className="group grid h-10 shrink-0 grid-cols-[1fr_40px] items-center pr-2 pl-5 hover:bg-hover"
              >
                <ValidatorsTable.ShortRow validator={validator} identity={identity} chain={chain} />
              </li>
            );
          })}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
