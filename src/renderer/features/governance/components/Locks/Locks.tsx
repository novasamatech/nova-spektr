import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, Plate, Shimmering } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
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

  return (
    <button disabled={isLoading || totalLock.isZero()} onClick={onClick}>
      <Plate className="flex h-[90px] w-[240px] items-center justify-between px-4 pb-4.5 pt-3">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-1">
            <Icon name="opengovLock" size={16} />
            <FootnoteText>{t('governance.locks.lock')}</FootnoteText>
            {isUnlockLoading && <Shimmering width={100} height={15} />}
            {!isUnlockLoading && isUnlockable && (
              <FootnoteText className="ml-1 text-text-positive">{t('governance.locks.unlockable')}</FootnoteText>
            )}
          </div>
          {isLoading && <Shimmering width={120} height={18} />}
          {!isLoading && network && (
            <AssetBalance className="text-small-title" value={totalLock.toString()} asset={network.asset} />
          )}
        </div>
        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
