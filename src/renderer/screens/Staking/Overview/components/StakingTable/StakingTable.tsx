import { Explorers } from '@renderer/components/common';
import { Balance, Icon, Identicon, Table } from '@renderer/components/ui';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, SigningType } from '@renderer/domain/shared-kernel';

export type AccountStakeInfo = {
  address: AccountID;
  stash?: AccountID;
  signingType: SigningType;
  accountName: string;
  walletName?: string;
  accountIsSelected: boolean;
  totalReward?: string;
  totalStake?: string;
};

type Props = {
  stakeInfo: AccountStakeInfo[];
  selectedStakes: AccountID[];
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  openValidators: (stash?: AccountID) => void;
  selectStaking: (keys: string[]) => void;
};

const StakingTable = ({
  stakeInfo,
  selectedStakes,
  asset,
  explorers,
  addressPrefix,
  openValidators,
  selectStaking,
}: Props) => {
  const { t } = useI18n();

  return (
    <Table className="mt-5" by="address" dataSource={stakeInfo} selectedKeys={selectedStakes} onSelect={selectStaking}>
      <Table.Header>
        <Table.Column dataKey="accountName" align="left">
          {t('staking.overview.accountTableHeader')}
        </Table.Column>
        <Table.Column dataKey="totalReward" width={150}>
          {t('staking.overview.rewardsTableHeader')}
        </Table.Column>
        <Table.Column dataKey="totalStake" width={150} sort>
          {t('staking.overview.stakeTableHeader')}
        </Table.Column>
        <Table.Column dataKey="actions" width={50} />
      </Table.Header>
      <Table.Body<AccountStakeInfo>>
        {(stake) => (
          <Table.Row key={stake.address} selectable={stake.signingType !== SigningType.WATCH_ONLY}>
            <Table.Cell>
              <div className="grid grid-flow-col gap-x-1">
                <Identicon className="row-span-2 self-center" address={stake.address} background={false} />
                <p className="text-neutral text-sm font-semibold">{stake.accountName}</p>
                {stake.walletName && <p className="text-neutral-variant text-2xs">{stake.walletName}</p>}
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
                explorers={explorers}
                address={stake.address}
                addressPrefix={addressPrefix}
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
