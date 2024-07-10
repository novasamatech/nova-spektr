import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Icon, FootnoteText, Shimmering, Plate } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { locksModel } from '../../model/locks';
import { unlockModel } from '../../model/unlock';
import { Unlock } from '../Unlock/Unlock';

export const Locks = () => {
  const { t } = useI18n();

  const asset = useUnit(locksModel.$asset);
  const totalLock = useUnit(locksModel.$totalLock);
  const isLoading = useUnit(locksModel.$isLoading);
  const isUnlockable = useUnit(unlockModel.$isUnlockable);

  return (
    <>
      <button onClick={() => unlockModel.events.flowStarted()} disabled={isLoading || totalLock.isZero()}>
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
            {!isLoading && asset && <AssetBalance value={totalLock.toString()} asset={asset} />}
          </div>
          <Icon name="arrowRight" />
        </Plate>
      </button>

      <Unlock />
    </>
  );
};
