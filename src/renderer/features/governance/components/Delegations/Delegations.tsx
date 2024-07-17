import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';

import { FootnoteText, Icon, Plate, Shimmering } from '@shared/ui';

import { AssetBalance } from '@entities/asset';

import { delegationModel } from '../../aggregates/delegation';

export const Delegations = () => {
  const { t } = useI18n();

  const totalDelegation = useUnit(delegationModel.$totalDelegations);
  const asset = useUnit(delegationModel.$asset);
  const isLoading = useUnit(delegationModel.$isLoading);

  return (
    <button onClick={() => console.log('Go to Delegate')}>
      <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5 flex justify-between items-center">
        <div className="flex flex-col gap-y-2 items-start">
          <div className="flex gap-x-1 items-center">
            <Icon size={16} name="opengovDelegations" />
            <FootnoteText>{t('governance.delegations')}</FootnoteText>
          </div>

          {isLoading && <Shimmering width={120} height={20} />}
          {!isLoading && asset && <AssetBalance className="text-small-title" value={totalDelegation} asset={asset} />}
        </div>

        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
