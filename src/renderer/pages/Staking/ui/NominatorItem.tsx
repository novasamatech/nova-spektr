import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type Account, type Address, type Asset, type Explorer } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton, Plate, Shimmering } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { ExplorersPopover, walletModel, walletUtils } from '@/entities/wallet';
import { type NominatorInfo } from '../lib/types';

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
      {activeWallet && !walletUtils.isWatchOnly(activeWallet) && nominatorsLength > 1 ? (
        <Checkbox
          className="w-full"
          disabled={isStakingLoading}
          checked={stake.isSelected}
          onChange={(event) => onToggleNominator(stake.address, event.target?.checked)}
        >
          <div className="grid w-full max-w-[207px] grid-cols-[minmax(10px,1fr),auto]">{content}</div>
        </Checkbox>
      ) : (
        <div className="grid max-w-[222px] grid-cols-[minmax(10px,1fr),auto] items-center gap-x-2">{content}</div>
      )}
      <div className="flex flex-col items-end gap-y-0.5 justify-self-end">
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
      <div className="flex flex-col items-end gap-y-0.5 justify-self-end">
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
        button={<IconButton name="details" />}
        address={stake.address}
        addressPrefix={addressPrefix}
        explorers={explorers}
      >
        <ExplorersPopover.Group active={Boolean(stake.stash)}>
          <button
            type="button"
            className={cnTw(
              'group flex h-full w-full items-center gap-x-2 rounded-md px-2 py-1 transition-colors',
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
