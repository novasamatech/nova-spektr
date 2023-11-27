import { ReactNode } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import type { Asset, Explorer, Address, NominatorInfo } from '@shared/core';
import { FootnoteText, Plate, Checkbox, Icon, Shimmering } from '@shared/ui';
import { ExplorersPopover, walletModel, walletUtils } from '@entities/wallet';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';

type Props = {
  nominatorsLength: number;
  asset?: Asset;
  explorers?: Explorer[];
  isStakingLoading: boolean;
  stake: NominatorInfo;
  content: ReactNode;
  addressPrefix?: number;
  onToggleNominator: (nominator: Address, boolean: boolean) => void;
  onCheckValidators: (stash?: Address) => void;
};

export const NominatorsItem = ({
  nominatorsLength,
  asset,
  explorers = [],
  stake,
  content,
  isStakingLoading,
  addressPrefix,
  onToggleNominator,
  onCheckValidators,
}: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);

  const validatorsButton = (
    <button
      type="button"
      className="flex items-center gap-x-2 px-2 w-full h-full"
      onClick={() => onCheckValidators(stake.stash)}
    >
      <Icon name="viewValidators" size={16} />
      <FootnoteText as="span" className="text-text-primary">
        {t('staking.overview.viewValidatorsOption')}
      </FootnoteText>
    </button>
  );

  return (
    <Plate className="grid grid-cols-[1fr,104px,104px,20px] items-center gap-x-6">
      {!walletUtils.isWatchOnly(activeWallet) && nominatorsLength > 1 ? (
        <Checkbox
          disabled={isStakingLoading}
          checked={stake.isSelected}
          onChange={(event) => onToggleNominator(stake.address, event.target?.checked)}
        >
          <div className="grid grid-cols-[minmax(10px,1fr),auto] max-w-[207px]">{content}</div>
        </Checkbox>
      ) : (
        <div className="grid grid-cols-[minmax(10px,1fr),auto] items-center gap-x-2 max-w-[222px]">{content}</div>
      )}
      <div className="justify-self-end flex flex-col items-end">
        {!stake.totalStake || !asset ? (
          <>
            <Shimmering width={82} height={15} />
            <Shimmering width={56} height={10} />
          </>
        ) : (
          <>
            <AssetBalance value={stake.totalStake} asset={asset} />
            <AssetFiatBalance amount={stake.totalStake} asset={asset} />
          </>
        )}
      </div>
      <div className="justify-self-end flex flex-col items-end">
        {!stake.totalReward || !asset ? (
          <>
            <Shimmering width={82} height={15} />
            <Shimmering width={56} height={10} />
          </>
        ) : (
          <>
            <AssetBalance value={stake.totalReward} asset={asset} />
            <AssetFiatBalance amount={stake.totalReward} asset={asset} />
          </>
        )}
      </div>
      <ExplorersPopover
        button={<Icon name="info" size={16} />}
        address={stake.address}
        addressPrefix={addressPrefix}
        explorers={explorers}
      >
        {stake.stash && validatorsButton}
      </ExplorersPopover>
    </Plate>
  );
};
