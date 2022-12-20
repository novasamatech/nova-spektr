import { useEffect, useState } from 'react';

import { Checkbox, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, SigningType } from '@renderer/domain/shared-kernel';
import { StakingMap } from '@renderer/services/staking/common/types';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
import { AccountDS, WalletDS } from '@renderer/services/storage';
import { AccountStakeInfo } from '../common/types';
import StakingListItem from '../StakingListItem/StakingListItem';

type Props = {
  staking: StakingMap;
  wallets: WalletDS[];
  accounts: AccountDS[];
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
};

const StakingList = ({ staking, asset, accounts, wallets, explorers, addressPrefix }: Props) => {
  const { t } = useI18n();

  const [sortType, setSortType] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedAccounts, setSelectedAccounts] = useState<AccountID[]>([]);

  useEffect(() => {
    if (!asset) return;

    setSelectedAccounts([]);
  }, [asset]);

  const { watchOnlyAccs, paritySignerAccs } = accounts.reduce<Record<string, AccountID[]>>(
    (acc, account) => {
      if (!account.accountId) return acc;

      if (account.signingType === SigningType.WATCH_ONLY) {
        acc.watchOnlyAccs.push(account.accountId);
      } else {
        acc.paritySignerAccs.push(account.accountId);
      }

      return acc;
    },
    { watchOnlyAccs: [], paritySignerAccs: [] },
  );

  const { rewards, isLoading } = useStakingRewards(watchOnlyAccs.concat(paritySignerAccs), addressPrefix);

  const isAllAccountsSelected = accounts.length > 0 && selectedAccounts.length === paritySignerAccs.length;

  const accountData = accounts.reduce<Record<AccountID, AccountDS>>((acc, account) => {
    return account.accountId ? { ...acc, [account.accountId]: account } : acc;
  }, {});

  const walletNames = wallets.reduce<Record<string, string>>((acc, wallet) => {
    return wallet.id ? { ...acc, [wallet.id]: wallet.name } : acc;
  }, {});

  const rootNames = accounts.reduce<Record<AccountID, string>>((acc, account) => {
    const isChainOrWatchOnly = account.rootId || account.signingType === SigningType.WATCH_ONLY;
    if (!account.id || isChainOrWatchOnly) return acc;

    return { ...acc, [account.id.toString()]: account.name };
  }, {});

  const getTotalStakeInfo = Object.entries(staking).reduce<AccountStakeInfo[]>((acc, [address, stake]) => {
    const accMatch = accountData[address];
    if (!accMatch) return acc;

    let walletName = accMatch.walletId ? walletNames[accMatch.walletId.toString()] : '';
    if (accMatch.rootId) {
      //eslint-disable-next-line i18next/no-literal-string
      walletName += `- ${rootNames[accMatch.rootId.toString()]}`;
    }

    return acc.concat({
      address,
      walletName,
      signingType: accMatch.signingType,
      accountName: accMatch.name,
      isSelected: selectedAccounts.includes(address),
      totalStake: stake?.total || '0',
      totalReward: isLoading ? undefined : rewards[address],
    });
  }, []);

  const toggleAllAccounts = () => {
    if (isAllAccountsSelected) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(paritySignerAccs);
    }
  };

  const setListSorting = () => {
    setSortType((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
  };

  const toggleAccount = (address: AccountID) => {
    if (selectedAccounts.includes(address)) {
      setSelectedAccounts((prev) => prev.filter((accountId) => accountId !== address));
    } else {
      setSelectedAccounts((prev) => prev.concat(address));
    }
  };

  return (
    <div className="w-full bg-white rounded-2lg mt-5">
      <div className="flex items-center py-2 pl-4 pr-11 border-b border-shade-5 sticky top-0 z-10 bg-white">
        <Checkbox checked={isAllAccountsSelected} onChange={toggleAllAccounts} />
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
        {getTotalStakeInfo.map((stake) => (
          <li key={stake.address}>
            <StakingListItem
              stakeInfo={stake}
              asset={asset}
              addressPrefix={addressPrefix}
              explorers={explorers}
              onChecked={() => toggleAccount(stake.address)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StakingList;
