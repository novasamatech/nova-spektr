import { ReactNode } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@renderer/app/providers';
import type { Asset, Explorer, Address } from '@renderer/shared/core';
import { FootnoteText, Plate, Checkbox, InfoPopover, Icon, Shimmering, ExplorerLink } from '@renderer/shared/ui';
import { walletModel, walletUtils } from '@renderer/entities/wallet';
import { AssetBalance } from '@renderer/entities/asset';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';
import { NominatorInfo } from '../NominatorsList';
import { getAccountExplorer } from '@/src/renderer/shared/lib/utils';

type Props = {
  nominators: NominatorInfo[];
  asset?: Asset;
  explorers?: Explorer[];
  isStakingLoading: boolean;
  stake: NominatorInfo;
  content: ReactNode;
  onToggleNominator: (nominator: Address, boolean: boolean) => void;
  onCheckValidators: (stash?: Address) => void;
};

export const NominatorsItem = ({
  nominators,
  asset,
  explorers,
  stake,
  content,
  isStakingLoading,
  onToggleNominator,
  onCheckValidators,
}: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);

  const getExplorers = (address: Address, stash?: Address, explorers: Explorer[] = []) => {
    const explorersContent = explorers.map((explorer) => ({
      id: explorer.name,
      value: <ExplorerLink name={explorer.name} href={getAccountExplorer(explorer, { address })} />,
    }));

    if (!stash) return [{ items: explorersContent }];

    const validatorsButton = (
      <button
        type="button"
        className="flex items-center gap-x-2 px-2 w-full h-full"
        onClick={() => onCheckValidators(stash)}
      >
        <Icon name="viewValidators" size={16} />
        <FootnoteText as="span" className="text-text-primary">
          {t('staking.overview.viewValidatorsOption')}
        </FootnoteText>
      </button>
    );

    return [{ items: [{ id: '0', value: validatorsButton }] }, { items: explorersContent }];
  };

  return (
    <Plate className="grid grid-cols-[226px,104px,104px,40px] items-center gap-x-6 ml-3">
      {!walletUtils.isWatchOnly(activeWallet) && nominators.length > 1 ? (
        <Checkbox
          disabled={isStakingLoading}
          checked={stake.isSelected}
          onChange={(event) => onToggleNominator(stake.address, event.target?.checked)}
        >
          {content}
        </Checkbox>
      ) : (
        <div className="flex items-center gap-x-2">{content}</div>
      )}
      <div className="justify-self-end flex flex-col items-end">
        {!stake.totalStake || !asset ? (
          <>
            <Shimmering width={82} height={20} />
            <Shimmering width={56} height={18} />
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
            <Shimmering width={82} height={20} />
            <Shimmering width={56} height={18} />
          </>
        ) : (
          <>
            <AssetBalance value={stake.totalReward} asset={asset} />
            <AssetFiatBalance amount={stake.totalReward} asset={asset} />
          </>
        )}
      </div>
      <InfoPopover data={getExplorers(stake.address, stake.stash, explorers)} position="top-full right-0">
        <Icon name="info" size={14} />
      </InfoPopover>
    </Plate>
  );
};
