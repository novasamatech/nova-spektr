import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, Plate, Shimmering, SmallTitleText } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { delegationAggregate } from '../../aggregates/delegation';

type Props = {
  onClick: () => void;
};

export const Delegations = ({ onClick }: Props) => {
  const { t } = useI18n();

  const totalDelegation = useUnit(delegationAggregate.$totalDelegations);
  const asset = useUnit(delegationAggregate.$asset);
  const isLoading = useUnit(delegationAggregate.$isLoading);

  return (
    <button onClick={onClick}>
      <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5 flex justify-between items-center">
        <div className="flex flex-col gap-y-2 items-start">
          <div className="flex gap-x-1 items-center">
            <Icon size={16} name="opengovDelegations" />
            <FootnoteText>{t('governance.delegations')}</FootnoteText>
          </div>

          {isLoading && <Shimmering width={120} height={20} />}
          {!isLoading &&
            asset &&
            (totalDelegation !== '0' ? (
              <AssetBalance className="text-small-title" value={totalDelegation} asset={asset} />
            ) : (
              <SmallTitleText>{t('governance.addDelegation.actionButton')}</SmallTitleText>
            ))}
        </div>

        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
