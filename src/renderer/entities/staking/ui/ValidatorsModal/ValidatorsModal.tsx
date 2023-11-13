import { Accordion, BaseModal, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Validator } from '@shared/core/types/validator';
import { cnTw } from '@shared/lib/utils';
import type { Asset, Explorer } from '@shared/core';
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
              <p className="text-text-tertiary">({selectedValidators.length})</p>
            </SmallTitleText>
          </Accordion.Button>
          <Accordion.Content>
            <ValidatorsTable validators={selectedValidators} listClassName="max-h-none">
              {(validtor, rowStyle) => (
                <li key={validtor.address} className={cnTw(rowStyle, 'hover:bg-hover group')}>
                  <ValidatorsTable.Row validator={validtor} asset={asset} explorers={explorers} />
                </li>
              )}
            </ValidatorsTable>
          </Accordion.Content>
        </Accordion>

        <Accordion isDefaultOpen>
          <Accordion.Button buttonClass="px-5 py-[5px]">
            <SmallTitleText className="flex">
              {t('staking.confirmation.notElectedValidators')}&nbsp;
              <p className="text-text-tertiary">({notSelectedValidators.length})</p>
            </SmallTitleText>
          </Accordion.Button>
          <Accordion.Content>
            <ValidatorsTable validators={notSelectedValidators} listClassName="max-h-none">
              {(validtor, rowStyle) => (
                <li key={validtor.address} className={cnTw(rowStyle, 'hover:bg-hover group')}>
                  <ValidatorsTable.Row validator={validtor} asset={asset} explorers={explorers} />
                </li>
              )}
            </ValidatorsTable>
          </Accordion.Content>
        </Accordion>
      </div>
    </BaseModal>
  );
};
