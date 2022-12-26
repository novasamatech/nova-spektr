import { useState } from 'react';

import { Checkbox, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { AccountStakeInfo } from '../common/types';
import StakingListItem from '../StakingListItem/StakingListItem';

type Props = {
  staking: AccountStakeInfo[];
  asset?: Asset;
  allAccountsSelected: boolean;
  explorers?: Explorer[];
  addressPrefix?: number;
  onSelect: (address: AccountID) => void;
  onSelectAll: () => void;
};

const StakingList = ({
  staking,
  allAccountsSelected,
  asset,
  explorers,
  addressPrefix,
  onSelect,
  onSelectAll,
}: Props) => {
  const { t } = useI18n();

  const [sortType, setSortType] = useState<'ASC' | 'DESC'>('DESC');

  const setListSorting = () => {
    setSortType((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
  };

  return (
    <div className="w-full bg-white rounded-2lg mt-5">
      <div className="flex items-center py-2 pl-4 pr-11 border-b border-shade-5 sticky top-0 z-10 bg-white">
        <Checkbox checked={allAccountsSelected} onChange={onSelectAll} />
        <p className="text-2xs font-bold uppercase text-neutral-variant ml-2.5 mr-auto">
          {t('staking.overview.accountTableHeader')}
        </p>
        <p className="pl-3 w-[150px] text-2xs font-bold uppercase text-neutral-variant text-right">
          {t('staking.overview.rewardsTableHeader')}
        </p>
        <div className="pl-3 w-[150px]">
          <button type="button" className="flex gap-x-1 ml-auto text-neutral-variant" onClick={setListSorting}>
            <p className="text-2xs font-bold uppercase">{t('staking.overview.stakeTableHeader')}</p>
            <Icon name={sortType === 'DESC' ? 'down' : 'up'} size={12} />
          </button>
        </div>
      </div>
      <ul>
        {staking.map((stake) => (
          <li key={stake.address}>
            <StakingListItem
              stakeInfo={stake}
              asset={asset}
              addressPrefix={addressPrefix}
              explorers={explorers}
              onSelect={() => onSelect(stake.address)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StakingList;
