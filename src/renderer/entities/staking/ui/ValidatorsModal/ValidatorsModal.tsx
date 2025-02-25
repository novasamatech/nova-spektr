import { type Asset, type Explorer } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
// eslint-disable-next-line boundaries/element-types
import { type AccountIdentity } from '@/domains/network';
import { ValidatorsTable } from '../ValidatorsTable/ValidatorsTable';

type Props = {
  isOpen: boolean;
  selectedValidators: Validator[];
  notSelectedValidators: Validator[];
  identities: Record<AccountId, AccountIdentity>;
  asset?: Asset;
  explorers?: Explorer[];
  onClose: () => void;
};

export const ValidatorsModal = ({
  isOpen,
  selectedValidators,
  notSelectedValidators,
  identities,
  explorers,
  asset,
  onClose,
}: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="lg" isOpen={isOpen} onToggle={onClose}>
      <Modal.Title close>{t('staking.confirmation.validatorsTitle')} </Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-y-4">
          <Accordion isDefaultOpen>
            <Accordion.Button buttonClass="px-5 py-[5px]">
              <SmallTitleText className="flex">
                {t('staking.confirmation.electedValidators')}&nbsp;
                <span className="text-text-tertiary">({selectedValidators.length})</span>
              </SmallTitleText>
            </Accordion.Button>
            <Accordion.Content>
              <ValidatorsTable validators={selectedValidators} listClassName="max-h-none">
                {(validator, rowStyle) => (
                  <li key={validator.address} className={cnTw(rowStyle, 'group hover:bg-hover')}>
                    <ValidatorsTable.Row
                      validator={validator}
                      identity={identities[toAccountId(validator.address) as AccountId]}
                      asset={asset}
                      explorers={explorers}
                    />
                  </li>
                )}
              </ValidatorsTable>
            </Accordion.Content>
          </Accordion>

          <Accordion isDefaultOpen>
            <Accordion.Button buttonClass="px-5 py-[5px]">
              <SmallTitleText className="flex">
                {t('staking.confirmation.notElectedValidators')}&nbsp;
                <span className="text-text-tertiary">({notSelectedValidators.length})</span>
              </SmallTitleText>
            </Accordion.Button>
            <Accordion.Content>
              <ValidatorsTable validators={notSelectedValidators} listClassName="max-h-none">
                {(validator, rowStyle) => (
                  <li key={validator.address} className={cnTw(rowStyle, 'group hover:bg-hover')}>
                    <ValidatorsTable.Row
                      validator={validator}
                      identity={identities[toAccountId(validator.address) as AccountId]}
                      asset={asset}
                      explorers={explorers}
                    />
                  </li>
                )}
              </ValidatorsTable>
            </Accordion.Content>
          </Accordion>
        </div>
      </Modal.Content>
    </Modal>
  );
};
