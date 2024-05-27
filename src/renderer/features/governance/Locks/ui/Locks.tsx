import { useUnit } from 'effector-react';

import { Icon, FootnoteText, Shimmering } from '@shared/ui';
import { locksModel } from '../model/locks-model';
import { AssetBalance } from '@entities/asset';

type Props = {
  onClick: () => void;
};
export const Locks = ({ onClick }: Props) => {
  const asset = useUnit(locksModel.$asset);
  const maxLock = useUnit(locksModel.$maxLock);
  const isLoading = useUnit(locksModel.$isLoading);

  return (
    <button className="border border-gray-200 rounded-sm" onClick={onClick}>
      <div className="flex flex-col gap-y-1 p-2">
        <Icon name="opengovLock" />
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <FootnoteText>Lock</FootnoteText>
        {isLoading && <Shimmering width={100} height={20} />}
        {!isLoading && asset && <AssetBalance value={maxLock.toString()} asset={asset} />}
      </div>
    </button>
  );
};
