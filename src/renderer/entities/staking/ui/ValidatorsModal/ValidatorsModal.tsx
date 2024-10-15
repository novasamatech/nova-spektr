import { type Asset, type Explorer } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Accordion, BaseModal, SmallTitleText } from '@/shared/ui';
import { ValidatorsTable } from '../ValidatorsTable/ValidatorsTable';

type Props = {
  isOpen: boolean;
  selectedValidators: Validator[];
  notSelectedValidators: Validator[];
  asset?: Asset;
  explorers?: Explorer[];
  onClose: () => void;
};

export const ValidatorsModal = ({
  isOpen,
  selectedValidators,
  notSelectedValidators,
  explorers,
  asset,
  onClose,
}: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 pt-2"
      panelClass="w-[784px] max-h-[660px] overflow-x-hidden"
      title={t('staking.confirmation.validatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
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
                  <ValidatorsTable.Row validator={validator} asset={asset} explorers={explorers} />
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
                  <ValidatorsTable.Row validator={validator} asset={asset} explorers={explorers} />
                </li>
              )}
            </ValidatorsTable>
          </Accordion.Content>
        </Accordion>
      </div>
    </BaseModal>
  );
};
