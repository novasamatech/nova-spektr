import { Expandable, ValidatorsTable } from '@renderer/components/common';
import { BaseModal, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { ValidatorMap } from '@renderer/services/staking/common/types';

type Props = {
  stash: AccountID;
  validators: ValidatorMap;
  nominators: ValidatorMap;
  asset?: Asset;
  explorers?: Explorer[];
  isOpen: boolean;
  onClose: () => void;
};

const NominatorsModal = ({ stash, validators, nominators, asset, explorers, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const elected = Object.values(nominators).reduce<Validator[]>((acc, nominator) => {
    if (validators[nominator.address]) {
      acc.push(validators[nominator.address]);
    }

    return acc;
  }, []);

  const notElected = Object.values(nominators).reduce<Validator[]>((acc, nominator) => {
    if (!validators[nominator.address]) {
      acc.push(nominator);
    }

    return acc;
  }, []);

  const validatorsExist = elected.length > 0 || notElected.length > 0;

  return (
    <BaseModal
      closeButton
      contentClass="w-[700px] py-6"
      title={t('staking.nominators.yourValidatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      {validatorsExist ? (
        <div className="max-h-[600px] overflow-y-auto">
          {elected.length > 0 && (
            <Expandable
              wrapperClass="mb-5 mx-[15px] border border-shade-5 rounded-2lg"
              itemClass="px-[15px] py-2.5 border-b border-shade-5"
              item={
                <div className="flex items-center gap-x-2.5 w-full pr-2.5">
                  <Icon
                    className="text-success border border-success rounded-full p-[1px]"
                    name="checkmark"
                    size={18}
                  />
                  <p className="font-semibold text-neutral-variant leading-tight">
                    {t('staking.nominators.electedTitle')}
                  </p>
                  <span className="ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                    {elected.length}
                  </span>
                </div>
              }
            >
              <ValidatorsTable
                stash={stash}
                validators={elected}
                columns={['nominated']}
                amountBadge={false}
                asset={asset}
                explorers={explorers}
              />
            </Expandable>
          )}

          {notElected.length > 0 && (
            <Expandable
              wrapperClass="mx-[15px] border border-shade-5 rounded-2lg"
              itemClass="px-[15px] py-1 border-b border-shade-5"
              item={
                <div className="grid grid-flow-col grid-cols-[repeat(2,max-content),1fr] gap-x-2.5 items-center w-full mr-2.5">
                  <Icon className="row-span-2 text-neutral-variant" name="clock" size={18} />
                  <p className="font-semibold text-neutral-variant leading-tight">
                    {t('staking.nominators.notElectedTitle')}
                  </p>
                  <p className="text-shade-40 text-2xs">{t('staking.nominators.notElectedDescription')}</p>
                  <span className="row-span-2 ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                    {notElected.length}
                  </span>
                </div>
              }
            >
              <ValidatorsTable showHeader={false} validators={notElected} asset={asset} explorers={explorers} />
            </Expandable>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-10 mb-5">
          <Icon as="img" name="noResults" size={300} />
          <p className="text-neutral text-3xl font-bold">{t('staking.overview.noValidatorsLabel')}</p>
          <p className="text-neutral-variant text-base font-normal">{t('staking.overview.noValidatorsDescription')}</p>
        </div>
      )}
    </BaseModal>
  );
};

export default NominatorsModal;
