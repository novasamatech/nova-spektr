import { BN, BN_ZERO } from '@polkadot/util';

import { Balance } from '@renderer/components/ui';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID } from '@renderer/domain/shared-kernel';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';

const getTotal = (values: string[]): BN => {
  return values.reduce((acc, value) => acc.add(new BN(value || 0)), BN_ZERO);
};

type Props = {
  totalStakes: string[];
  asset?: Asset;
  accounts: AccountID[];
  addressPrefix?: number;
};

const TotalAmount = ({ totalStakes, asset, accounts, addressPrefix }: Props) => {
  const { t } = useI18n();
  const { rewards, isLoading } = useStakingRewards(accounts, addressPrefix);
  const totalInfo = [
    {
      isLoading: isLoading,
      title: t('staking.overview.totalRewardsLabel'),
      amount: getTotal(Object.values(rewards)).toString(),
      asset,
    },
    {
      isLoading: totalStakes.length === 0,
      title: t('staking.overview.totalStakedLabel'),
      amount: getTotal(totalStakes).toString(),
      asset,
    },
  ];

  return (
    <div className="flex items-center gap-x-12.5 ml-auto">
      {totalInfo.map(({ isLoading, title, amount, asset }) =>
        isLoading || !asset ? (
          <div key={title} className="flex flex-col items-end gap-y-1" data-testid="total-loading">
            <Shimmering width={114} height={14} />
            <Shimmering width={200} height={26} />
          </div>
        ) : (
          <div key={title} className="text-right">
            <p className="uppercase text-shade-40 font-semibold text-xs">{title}</p>
            <Balance
              className="font-semibold text-2xl text-neutral leading-7"
              value={amount.toString()}
              precision={asset.precision}
              symbol={asset.symbol}
            />
          </div>
        ),
      )}
    </div>
  );
};

export default TotalAmount;
