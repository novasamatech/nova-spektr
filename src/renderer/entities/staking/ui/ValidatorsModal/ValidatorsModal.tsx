import { type Asset, type Chain } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Accordion, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AccountIdentity } from '@/domains/network';
// eslint-disable-next-line boundaries/element-types
import { ValidatorsTable } from '@/widgets/validators-table';

type Props = {
  isOpen: boolean;
  selectedValidators: Validator[];
  notSelectedValidators: Validator[];
  identities: Record<AccountId, AccountIdentity>;
  asset?: Asset;
  chain?: Chain;
  onClose: () => void;
};

export const ValidatorsModal = ({
  isOpen,
  selectedValidators,
  notSelectedValidators,
  identities,
  chain,
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
                  <li key={validator.accountId} className={cnTw(rowStyle, 'group hover:bg-hover')}>
                    <ValidatorsTable.Row
                      validator={validator}
                      identity={identities[validator.accountId]}
                      asset={asset}
                      chain={chain}
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
                  <li key={validator.accountId} className={cnTw(rowStyle, 'group hover:bg-hover')}>
                    <ValidatorsTable.Row
                      validator={validator}
                      identity={identities[validator.accountId]}
                      asset={asset}
                      chain={chain}
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
