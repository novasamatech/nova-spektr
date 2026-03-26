import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, Plate } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/widgets/price';
import { locksModel } from '../../model/locks';
import { networkSelectorModel } from '../../model/networkSelector';
import { unlockModel } from '../../model/unlock/unlock';

type Props = {
  onClick: () => void;
};

export const Locks = ({ onClick }: Props) => {
  const { t } = useI18n();

  const network = useUnit(networkSelectorModel.$network);
  const totalLock = useUnit(locksModel.$totalLock);
  const isLoading = useUnit(locksModel.$isLoading);
  const isUnlockable = useUnit(unlockModel.$isUnlockable);
  const isUnlockLoading = useUnit(unlockModel.$isLoading);

  const totalLockString = totalLock.toString();

  return (
    <button
      disabled={isLoading || totalLock.isZero()}
      className="cursor-pointer disabled:cursor-not-allowed"
      onClick={onClick}
    >
      <Plate className="flex h-[90px] w-[240px] items-center justify-between px-4 pt-3 pb-4.5">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-1">
            <Icon name="opengovLock" size={16} />
            <FootnoteText>{t('governance.locks.lock')}</FootnoteText>
            {isUnlockLoading && <Skeleton width={15} height={4} />}
            {!isUnlockLoading && isUnlockable && (
              <FootnoteText className="ml-1 text-text-positive">{t('governance.locks.unlockable')}</FootnoteText>
            )}
          </div>
          {isLoading && <Skeleton width={30} height={4.5} />}
          {!isLoading && network && (
            <div className="flex flex-col gap-y-0.5">
              <AssetBalance className="text-small-title" value={totalLockString} asset={network.asset} />
              <AssetFiatBalance amount={totalLockString} asset={network.asset} />
            </div>
          )}
        </div>
        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
