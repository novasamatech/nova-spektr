import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type Account, type Address, type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, Plate, Shimmering } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Checkbox } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type NominatorInfo } from '../lib/types';

type Props = {
  nominatorsLength: number;
  asset?: Asset;
  chain: Chain;
  isStakingLoading: boolean;
  stake: NominatorInfo<Account>;
  content: ReactNode;
  onToggleNominator: (nominator: Address, boolean: boolean) => void;
  onCheckValidators: (stash?: Address) => void;
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

  const activeWallet = useUnit(walletModel.$activeWallet);

  return (
    <Plate className="grid grid-cols-[1fr,104px,104px,20px] items-center gap-x-6">
      {activeWallet && !walletUtils.isWatchOnly(activeWallet) && nominatorsLength > 1 ? (
        <div className="w-full">
          <Checkbox
            disabled={isStakingLoading}
            checked={stake.isSelected}
            onChange={(checked) => onToggleNominator(stake.address, checked)}
          >
            <div className="grid w-full max-w-[207px] grid-cols-[minmax(10px,1fr),auto]">{content}</div>
          </Checkbox>
        </div>
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
      <AccountExplorers accountId={stake.account.accountId} chain={chain}>
        {nonNullable(stake.stash) && (
          <button
            type="button"
            className={cnTw(
              'group -mx-2 flex select-none items-center gap-x-1.5 rounded-md px-1.5 py-[3px] transition-colors',
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
