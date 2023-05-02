import { ApiPromise } from '@polkadot/api';
import { useMemo } from 'react';

import { Explorers } from '@renderer/components/common';
import { Balance, Icon, Identicon, Table, Shimmering, Popover } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Address, SigningType } from '@renderer/domain/shared-kernel';
import { bigNumberSorter } from '@renderer/shared/utils/bignumber';
import { Unlocking } from '@renderer/domain/stake';
import TimeToEra from '../TimeToEra/TimeToEra';

const getNextUnstaking = (unlocking: Unlocking[], currentEra?: number): Unlocking | undefined => {
  if (!currentEra) return undefined;

  return unlocking.find((u) => Number(u.era) > currentEra);
};

export type AccountStakeInfo = {
  address: Address;
  stash?: Address;
  signingType: SigningType;
  accountName: string;
  walletName?: string;
  accountIsSelected: boolean;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};

type Props = {
  api?: ApiPromise;
  currentEra?: number;
  stakeInfo: AccountStakeInfo[];
  selectedStakes: Address[];
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  openValidators: (stash?: Address) => void;
  selectStaking: (keys: string[]) => void;
};

const StakingTable = ({
  api,
  currentEra,
  stakeInfo,
  selectedStakes,
  asset,
  explorers,
  addressPrefix,
  openValidators,
  selectStaking,
}: Props) => {
  const { t } = useI18n();

  const signingTypeMap = useMemo(() => {
    return stakeInfo.reduce<Record<Address, SigningType>>((acc, info) => {
      acc[info.address] = info.signingType;

      return acc;
    }, {});
  }, [stakeInfo.length]);

  const getDisabled = (address: Address, signingType: SigningType): boolean => {
    if (signingType === SigningType.WATCH_ONLY) return false;
    if (!selectedStakes.length) return true;

    const activeSigningType = signingTypeMap[selectedStakes[0]];

    const passOnlyParitySigner =
      activeSigningType === SigningType.PARITY_SIGNER && signingType === SigningType.PARITY_SIGNER;
    const passOnlyOneMultisig = activeSigningType === SigningType.MULTISIG && address === selectedStakes[0];

    return passOnlyParitySigner || passOnlyOneMultisig;
  };

  return (
    <Table
      className="my-5 shadow-surface"
      by="address"
      dataSource={stakeInfo}
      selectedKeys={selectedStakes}
      onSelect={selectStaking}
    >
      <Table.Header>
        <Table.Column dataKey="accountName" align="left">
          {t('staking.overview.accountTableHeader')}
        </Table.Column>
        <Table.Column dataKey="totalReward" width={150}>
          {t('staking.overview.rewardsTableHeader')}
        </Table.Column>
        <Table.Column
          dataKey="totalStake"
          width={150}
          defaultSort="desc"
          sortable={(a, b) => bigNumberSorter(a.totalStake, b.totalStake)}
        >
          {t('staking.overview.stakeTableHeader')}
        </Table.Column>
        <Table.Column dataKey="actions" width={50} />
      </Table.Header>
      <Table.Body<AccountStakeInfo>>
        {(stake) => (
          <Table.Row
            className="bg-shade-1"
            key={stake.address}
            selectable={getDisabled(stake.address, stake.signingType)}
          >
            <Table.Cell>
              <div className="grid grid-flow-col gap-x-1">
                <Identicon className="row-span-2 self-center" address={stake.address} background={false} />
                <p className="text-neutral text-sm font-semibold">{stake.accountName}</p>
                {stake.walletName && <p className="text-neutral-variant text-2xs">{stake.walletName}</p>}

                {stake.unlocking &&
                  stake.unlocking.length > 0 &&
                  getNextUnstaking(stake.unlocking, Number(currentEra)) && (
                    <div className="row-span-2 self-center">
                      <Popover
                        titleIcon={<Icon name="unstake" size={14} />}
                        titleText={t('staking.badges.unstakeTitle')}
                        content={t('staking.badges.unstakeDescription')}
                      >
                        <div className="flex gap-1 items-center rounded-2lg bg-primary-variant text-on-primary-variant text-2xs px-2 py-0.5">
                          <Icon name="unstake" size={14} />
                          <TimeToEra
                            api={api}
                            era={Number(getNextUnstaking(stake.unlocking, Number(currentEra))?.era)}
                          />
                        </div>
                      </Popover>
                    </div>
                  )}
              </div>
            </Table.Cell>
            <Table.Cell>
              {stake.totalReward === undefined || !asset ? (
                <Shimmering width={140} height={14} />
              ) : (
                <Balance
                  className="text-xs font-semibold"
                  value={stake.totalReward}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              )}
            </Table.Cell>
            <Table.Cell>
              {stake.totalStake === undefined || !asset ? (
                <Shimmering width={140} height={14} />
              ) : (
                <Balance
                  className="text-xs font-semibold"
                  value={stake.totalStake}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              )}
            </Table.Cell>
            <Table.Cell>
              <Explorers
                className="ml-3"
                address={stake.address}
                addressPrefix={addressPrefix}
                explorers={explorers}
                header={
                  stake.stash && (
                    <div className="flex gap-x-2.5">
                      <Icon name="network" size={20} />
                      <button type="button" onClick={() => openValidators(stake.stash)}>
                        {t('staking.overview.viewValidatorsOption')}
                      </button>
                    </div>
                  )
                }
              />
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );
};

export default StakingTable;
