import { ReactNode } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import type { Asset, Explorer, Address, Account } from '@shared/core';
import { FootnoteText, Plate, Checkbox, Icon, Shimmering, IconButton } from '@shared/ui';
import { ExplorersPopover, walletModel, walletUtils } from '@entities/wallet';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { cnTw } from '@shared/lib/utils';
import { NominatorInfo } from '../lib/types';

type Props = {
  nominatorsLength: number;
  asset?: Asset;
  explorers?: Explorer[];
  isStakingLoading: boolean;
  stake: NominatorInfo<Account>;
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
      <div className="justify-self-end flex flex-col items-end gap-y-0.5">
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
      <div className="justify-self-end flex flex-col items-end gap-y-0.5">
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
        button={<IconButton name="info" />}
        address={stake.address}
        addressPrefix={addressPrefix}
        explorers={explorers}
      >
        <ExplorersPopover.Group active={Boolean(stake.stash)}>
          <button
            type="button"
            className={cnTw(
              'group flex items-center gap-x-2 px-2 py-1 w-full h-full rounded-md transition-colors',
              'hover:bg-action-background-hover focus:bg-action-background-hover',
            )}
            onClick={() => onCheckValidators(stake.stash)}
          >
            <Icon name="viewValidators" size={16} />
            <FootnoteText
              as="span"
              className="text-text-secondary transition-colors group-hover:text-text-primary group-focus:text-text-primary"
            >
              {t('staking.overview.viewValidatorsOption')}
            </FootnoteText>
          </button>
        </ExplorersPopover.Group>
      </ExplorersPopover>
    </Plate>
  );
};
