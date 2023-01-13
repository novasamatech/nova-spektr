import { Explorers } from '@renderer/components/common';
import { Balance, Checkbox, Icon, Identicon } from '@renderer/components/ui';
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
  stakeInfo: AccountStakeInfo;
  asset?: Asset;
  addressPrefix?: number;
  explorers?: Explorer[];
  onSelect: () => void;
  onOpenValidators: () => void;
};

const StakingListItem = ({ stakeInfo, asset, addressPrefix, explorers, onSelect, onOpenValidators }: Props) => {
  const { t } = useI18n();

  // TODO: let it stay for a while, full shimmering row
  //   return (
  //     <div className="flex items-center pl-4 pr-2 h-12.5 border-b border-shade-5 text-neutral">
  //       <div className="w-5 h-5 rounded-md border-shade-10 border-2 mr-2.5" />
  //       <div className="grid grid-flow-col items-center gap-x-1 gap-y-0.5 mr-auto">
  //         <Shimmering className="row-span-2" circle width={20} height={20} />
  //         <Shimmering width={Math.random() * 70 + 200} height={14} />
  //         <Shimmering width={Math.random() * 40 + 100} height={12} />
  //       </div>
  //       <div className="flex gap-x-2.5">
  //         <Shimmering width={140} height={14} />
  //         <Shimmering width={140} height={14} />
  //       </div>
  //       <div className="text-shade-10 w-5 ml-4">•••</div>
  //     </div>
  //   );

  const validatorsContent = stakeInfo.stash && (
    <div className="flex gap-x-2.5">
      <Icon name="network" size={20} />
      <button type="button" onClick={onOpenValidators}>
        {t('staking.overview.viewValidatorsOption')}
      </button>
    </div>
  );

  return (
    <li className="flex items-center pl-4 pr-2 h-12.5 border-b border-shade-5 text-neutral">
      <Checkbox
        className="h-full"
        disabled={stakeInfo.signingType === SigningType.WATCH_ONLY}
        checked={stakeInfo.accountIsSelected}
        onChange={onSelect}
      >
        <div className="grid grid-flow-col gap-x-1">
          <Identicon className="row-span-2 self-center" address={stakeInfo.address} background={false} />
          <p className="text-neutral text-sm font-semibold">{stakeInfo.accountName}</p>
          {stakeInfo.walletName && <p className="text-neutral-variant text-2xs">{stakeInfo.walletName}</p>}
        </div>
      </Checkbox>
      {/* TODO: show proper badges */}
      {/*<div className="flex gap-x-2.5 ml-5">*/}
      {/*  <Badge pallet="error" titleText="popover title" content="popover content">*/}
      {/*    /!* eslint-disable-next-line i18next/no-literal-string *!/*/}
      {/*    <span className="text-neutral text-sm">badge</span>*/}
      {/*  </Badge>*/}
      {/*</div>*/}
      <div className="ml-auto pl-3 w-[150px] text-xs font-semibold text-right">
        {stakeInfo.totalReward === undefined || !asset ? (
          <Shimmering width={140} height={14} />
        ) : (
          <Balance value={stakeInfo.totalReward} precision={asset.precision} symbol={asset.symbol} />
        )}
      </div>
      <div className="pl-3 w-[150px] text-xs font-semibold text-right">
        {stakeInfo.totalStake === undefined || !asset ? (
          <Shimmering width={140} height={14} />
        ) : (
          <Balance value={stakeInfo.totalStake} precision={asset.precision} symbol={asset.symbol} />
        )}
      </div>
      <Explorers
        className="ml-3"
        header={validatorsContent}
        explorers={explorers}
        address={stakeInfo.address}
        addressPrefix={addressPrefix}
      />
    </li>
  );
};

export default StakingListItem;
