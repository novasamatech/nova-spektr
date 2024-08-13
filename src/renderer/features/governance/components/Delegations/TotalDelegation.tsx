import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, Plate, Shimmering, SmallTitleText } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { delegationAggregate } from '../../aggregates/delegation';

type Props = {
  onClick: () => void;
};

export const TotalDelegation = ({ onClick }: Props) => {
  const { t } = useI18n();

  const totalDelegation = useUnit(delegationAggregate.$totalDelegations);
  const asset = useUnit(delegationAggregate.$asset);
  const isLoading = useUnit(delegationAggregate.$isLoading);

  return (
    <button onClick={onClick}>
      <Plate className="flex h-[90px] w-[240px] items-center justify-between px-4 pb-4.5 pt-3">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-1">
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
