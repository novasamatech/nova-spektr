import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, Duration, FootnoteText, Icon, Shimmering } from '@shared/ui';
import { UnlockChunkType } from '@shared/api/governance';
import { AssetBalance } from '@entities/asset';
import { locksModel } from '../../model/locks';
import { unlockModel } from '../../model/unlock';
import { unlockService } from '../../lib/unlock';

export const UnlockInfo = () => {
  const { t } = useI18n();

  const totalLock = useUnit(locksModel.$totalLock);
  const asset = useUnit(locksModel.$asset);
  const claimSchedule = useUnit(unlockModel.$claimSchedule);
  const isLoading = useUnit(unlockModel.$isLoading);

  return (
    <div className="pb-4 px-5 flex flex-col gap-y-3 items-center my-4">
      <Icon name="opengovVotingLock" size={60} />
      {asset && <AssetBalance className="mb-3 text-large-title" value={totalLock.toString()} asset={asset} />}
      {isLoading && <Shimmering width={250} height={20} />}
      {asset &&
        claimSchedule.length > 0 &&
        claimSchedule.map((unlock) => (
          <div
            key={`${unlock.amount.toString()}-${unlock.type}`}
            className="flex justify-between items-center self-stretch"
          >
            <AssetBalance value={unlock.amount.toString()} asset={asset} />
            {unlock.type === UnlockChunkType.CLAIMABLE && (
              <FootnoteText className="text-text-positive">{t('governance.locks.unlockable')}</FootnoteText>
            )}
            {unlock.type === UnlockChunkType.PENDING_DELIGATION && (
              <FootnoteText className="text-text-tertiary">{t('governance.locks.yourDelegation')}</FootnoteText>
            )}
            {unlock.type === UnlockChunkType.PENDING_LOCK && (
              <Duration
                className="text-text-tertiary"
                seconds={unlockService.getSecondsDuratonToBlock(unlock.timeToBlock!)}
              />
            )}
          </div>
        ))}
      <ActionsSection />
    </div>
  );
};

const ActionsSection = () => {
  const { t } = useI18n();

  // const canUnlock = useUnit(unlockModel.$canUnlock);

  return (
    <div className="flex self-end items-center mt-4">
      <Button type="submit" disabled={true}>
        {t('governance.locks.unlock')}
      </Button>
    </div>
  );
};
