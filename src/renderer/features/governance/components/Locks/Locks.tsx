import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, Plate, Shimmering } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { unlockAggregate } from '../../aggregates/unlock';
import { locksModel } from '../../model/locks';
import { votingAssetModel } from '../../model/votingAsset';
import { Unlock } from '../Unlock/Unlock';

export const Locks = () => {
  const { t } = useI18n();

  const asset = useUnit(votingAssetModel.$votingAsset);
  const totalLock = useUnit(locksModel.$totalLock);
  const isLoading = useUnit(locksModel.$isLoading);
  const isUnlockable = useUnit(unlockAggregate.$isUnlockable);

  return (
    <>
      <button disabled={isLoading || totalLock.isZero()} onClick={() => unlockAggregate.events.flowStarted()}>
        <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5 flex justify-between items-center">
          <div className="flex flex-col gap-y-2 items-start">
            <div className="flex gap-x-1 items-center">
              <Icon name="opengovLock" size={16} />
              <FootnoteText>{t('governance.locks.lock')}</FootnoteText>
              {isUnlockable && (
                <FootnoteText className="text-text-positive ml-1">{t('governance.locks.unlockable')}</FootnoteText>
              )}
            </div>
            {isLoading && <Shimmering width={120} height={20} />}
            {!isLoading && asset && (
              <AssetBalance className="text-small-title" value={totalLock.toString()} asset={asset} />
            )}
          </div>
          <Icon name="arrowRight" />
        </Plate>
      </button>

      <Unlock />
    </>
  );
};
