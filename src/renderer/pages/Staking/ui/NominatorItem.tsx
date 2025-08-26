import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon, Plate } from '@/shared/ui';
import { AccountExplorers, AssetBalance } from '@/shared/ui-entities';
import { Checkbox, Skeleton } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/entities/price';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type NominatorInfo } from '../lib/types';

type Props = {
  nominatorsLength: number;
  asset?: Asset;
  chain: Chain;
  isStakingLoading: boolean;
  stake: NominatorInfo;
  content: ReactNode;
  onToggleNominator: (nominator: AccountId, boolean: boolean) => void;
  onCheckValidators: (stash?: AccountId) => void;
};

export const NominatorsItem = ({
  nominatorsLength,
  asset,
  chain,
  stake,
  content,
  isStakingLoading,

  onToggleNominator,
  onCheckValidators,
}: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletSelect.$selectedWallet);

  return (
    <Plate className="grid grid-cols-[1fr_104px_104px_20px] items-center gap-x-6 py-2.5">
      {activeWallet && !walletUtils.isWatchOnly(activeWallet) && nominatorsLength > 1 ? (
        <div className="flex w-full gap-x-2">
          <Checkbox
            disabled={isStakingLoading}
            checked={stake.isSelected}
            onChange={(checked) => onToggleNominator(stake.account.accountId, checked)}
          />
          <div className="grid w-full max-w-[207px] grid-cols-[minmax(10px,1fr)_auto]">{content}</div>
        </div>
      ) : (
        <div className="grid max-w-[222px] grid-cols-[minmax(10px,1fr)_auto] items-center gap-x-2">{content}</div>
      )}

      {!stake.totalStake || !asset ? (
        <div className="flex flex-col items-end gap-y-1.5 pb-1">
          <Skeleton width={20} height={4} />
          <Skeleton width={14} height={3} />
        </div>
      ) : (
        <div className="flex flex-col items-end justify-self-end">
          <AssetBalance value={stake.totalStake} asset={asset} />
          <AssetFiatBalance amount={stake.totalStake} asset={asset} />
        </div>
      )}

      {!stake.totalReward || !asset ? (
        <div className="flex flex-col items-end gap-y-1.5 pb-1">
          <Skeleton width={20} height={4} />
          <Skeleton width={14} height={3} />
        </div>
      ) : (
        <div className="flex flex-col items-end justify-self-end">
          <AssetBalance value={stake.totalReward} asset={asset} />
          <AssetFiatBalance amount={stake.totalReward} asset={asset} />
        </div>
      )}

      <AccountExplorers accountId={stake.account.accountId} chain={chain}>
        {nonNullable(stake.stash) && (
          <button
            type="button"
            className={cnTw(
              'group -mx-2 flex items-center gap-x-1.5 rounded-md px-1.5 py-[3px] transition-colors select-none',
              'hover:bg-action-background-hover focus:bg-action-background-hover',
            )}
            onClick={() => onCheckValidators(stake.stash)}
          >
            <Icon name="viewValidators" size={16} />
            <FootnoteText
              as="span"
              className={cnTw(
                'text-text-secondary transition-colors',
                'group-hover:text-text-primary group-focus:text-text-primary',
              )}
            >
              {t('staking.overview.viewValidatorsOption')}
            </FootnoteText>
          </button>
        )}
      </AccountExplorers>
    </Plate>
  );
};
