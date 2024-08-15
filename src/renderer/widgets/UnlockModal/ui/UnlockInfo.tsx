import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type PendingChunkWithAddress, UnlockChunkType } from '@shared/api/governance';
import { getSecondsDuratonToBlock } from '@shared/lib/utils';
import { Button, Duration, FootnoteText, Icon, Shimmering } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price';
import { permissionUtils, walletModel } from '@entities/wallet';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { locksModel } from '@features/governance/model/locks';
import { votingAssetModel } from '@features/governance/model/votingAsset';
import { unlockAggregate } from '../aggregates/unlock';

export const UnlockInfo = () => {
  const { t } = useI18n();

  const totalLock = useUnit(locksModel.$totalLock);
  const asset = useUnit(votingAssetModel.$votingAsset);
  const pendingSchedule = useUnit(unlockAggregate.$pendingSchedule);
  const isLoading = useUnit(unlockAggregate.$isLoading);
  const totalUnlock = useUnit(unlockModel.$totalUnlock);

  if (!asset) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-y-1 px-5 pb-4">
      <Icon name="opengovVotingLock" size={60} />
      <AssetBalance className="mt-2 text-large-title" value={totalLock.toString()} asset={asset} />
      <AssetFiatBalance className="mb-5" amount={totalLock.toString()} asset={asset} />
      {isLoading && <Shimmering width={250} height={20} />}
      {!totalUnlock.isZero() && (
        <div className="mb-3 flex items-center justify-between self-stretch">
          <AssetBalance value={totalUnlock.toString()} asset={asset} />
          <FootnoteText className="text-text-positive">{t('governance.locks.unlockable')}</FootnoteText>
        </div>
      )}
      {pendingSchedule.map((lock, idx) => (
        <div
          key={`${lock.amount.toString()}-${lock.type}-${lock.address}-${idx}`}
          className="mb-3 flex items-center justify-between self-stretch"
        >
          <AssetBalance value={lock.amount.toString()} asset={asset} />
          {lock.type === UnlockChunkType.PENDING_DELIGATION && (
            <FootnoteText className="text-text-tertiary">{t('governance.locks.yourDelegation')}</FootnoteText>
          )}
          {lock.type === UnlockChunkType.PENDING_LOCK && <UnlockCountdown lock={lock} />}
        </div>
      ))}
      <ActionsSection />
    </div>
  );
};

const ActionsSection = () => {
  const { t } = useI18n();

  const isUnlockable = useUnit(unlockAggregate.$isUnlockable);
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet || !permissionUtils.canUnlock(activeWallet)) return null;

  return (
    <div className="mt-3 flex items-center self-end">
      <Button type="submit" disabled={!isUnlockable} onClick={() => unlockAggregate.events.unlockFormStarted()}>
        {t('governance.locks.unlock')}
      </Button>
    </div>
  );
};

const UnlockCountdown = ({ lock }: { lock: PendingChunkWithAddress }) => {
  const { t } = useI18n();

  const [countdown, setCountdown] = useState(getSecondsDuratonToBlock(lock.timeToBlock || 0));

  useEffect(() => {
    if (countdown === 0) return;

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown]);

  return (
    <FootnoteText className="text-text-tertiary">
      {t('governance.locks.unlockableIn')} <Duration as="span" className="text-text-tertiary" seconds={countdown} />
    </FootnoteText>
  );
};
