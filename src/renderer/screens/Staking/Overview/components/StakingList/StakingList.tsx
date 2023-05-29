import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { Address, SigningType, EraIndex } from '@renderer/domain/shared-kernel';
import { Unlocking } from '@renderer/domain/stake';
import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, Plate, BodyText, Checkbox, InfoPopover, Popover } from '@renderer/components/ui-redesign';
import { AccountAddress, ExplorerLink } from '@renderer/components/common';
import { Icon, Shimmering, Balance } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import TimeToEra from '../TimeToEra/TimeToEra';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { redeemableAmount } from '@renderer/shared/utils/balance';

const getNextUnstakingEra = (unlocking: Unlocking[] = [], era?: number): EraIndex | undefined => {
  if (!era) return undefined;

  const unlockingMatch = unlocking.find((u) => Number(u.era) > era);

  return unlockingMatch ? Number(unlockingMatch.era) : undefined;
};

const hasRedeem = (unlocking: Unlocking[] = [], era?: number): boolean => {
  if (!era || unlocking.length === 0) return false;

  return Boolean(redeemableAmount(unlocking, era));
};

export type AccountStakeInfo = {
  address: Address;
  stash?: Address;
  signingType: SigningType;
  accountName: string;
  isSelected: boolean;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};

type Props = {
  api?: ApiPromise;
  era?: number;
  stakeInfo: AccountStakeInfo[];
  asset?: Asset;
  explorers?: Explorer[];
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address) => void;
};

const StakingList = ({ api, era, stakeInfo, asset, explorers, onCheckValidators, onToggleNominator }: Props) => {
  const { t } = useI18n();

  const getExplorers = (address: Address, stash?: Address, explorers: Explorer[] = []) => {
    const explorersContent = explorers.map((explorer) => ({
      id: explorer.name,
      value: <ExplorerLink explorer={explorer} address={address} />,
    }));

    if (!stash) return [{ items: explorersContent }];

    const validatorsButton = (
      <button
        type="button"
        className="flex items-center gap-x-2 px-2 w-full h-full"
        onClick={() => onCheckValidators(stash)}
      >
        <Icon name="viewValidators" size={16} />
        <FootnoteText as="span">{t('staking.overview.viewValidatorsOption')}</FootnoteText>
      </button>
    );

    return [{ items: [{ id: '0', value: validatorsButton }] }, { items: explorersContent }];
  };

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[226px,104px,144px] items-center gap-x-6 px-3">
        <FootnoteText className="text-text-secondary">{t('staking.overview.accountTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('staking.overview.stakeTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('staking.overview.rewardsTableHeader')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">
        {stakeInfo.map((stake) => {
          const unstakeBadge = getNextUnstakingEra(stake.unlocking, era) && (
            <Popover
              offsetPx={-65}
              contentClass="py-1 px-2 bg-switch-background-active rounded w-max"
              position="left-1/2 -translate-x-1/2"
              content={
                <HelpText className="text-white">
                  <Trans t={t} i18nKey="staking.badges.unstakeDescription" />
                </HelpText>
              }
            >
              <div className="flex gap-x-1 items-center rounded-md bg-badge-background text-icon-accent text-2xs px-2 py-0.5">
                <Icon name="unstake" className="text-icon-accent" size={14} />
                <TimeToEra api={api} era={getNextUnstakingEra(stake.unlocking, era)} />
              </div>
            </Popover>
          );

          const redeemBadge = hasRedeem(stake.unlocking, era) && (
            <Popover
              offsetPx={-48}
              contentClass="py-1 px-2 bg-switch-background-active rounded w-max"
              position="left-1/2 -translate-x-1/2"
              content={
                <HelpText className="text-white">
                  <Trans t={t} i18nKey="staking.badges.redeemDescription" />
                </HelpText>
              }
            >
              <div className="flex gap-x-1 items-center rounded-md bg-positive-background text-text-positive text-2xs px-2 py-0.5">
                <Icon name="redeem" className="text-text-positive" size={14} />
                {t('staking.badges.redeemTitle')}
              </div>
            </Popover>
          );

          return (
            <li key={stake.address}>
              <Plate className="grid grid-cols-[226px,104px,104px,16px] items-center gap-x-6">
                <Checkbox checked={stake.isSelected} onChange={() => onToggleNominator(stake.address)}>
                  <AccountAddress name={stake.accountName} address={stake.address} />
                  {unstakeBadge || redeemBadge}
                </Checkbox>
                {stake.totalStake === undefined || !asset ? (
                  <Shimmering width={104} height={14} />
                ) : (
                  <BodyText>
                    <Balance
                      className="text-xs font-semibold"
                      value={stake.totalStake}
                      precision={asset.precision}
                      symbol={asset.symbol}
                    />
                  </BodyText>
                )}
                {stake.totalReward === undefined || !asset ? (
                  <Shimmering width={104} height={14} />
                ) : (
                  <BodyText>
                    <Balance
                      className="text-xs font-semibold"
                      value={stake.totalReward}
                      precision={asset.precision}
                      symbol={asset.symbol}
                    />
                  </BodyText>
                )}
                <InfoPopover data={getExplorers(stake.address, stake.stash, explorers)} position="top-full right-0">
                  <Icon name="info" size={14} className="text-icon-default" />
                </InfoPopover>
              </Plate>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // const signingTypeMap = useMemo(() => {
  //   return stakeInfo.reduce<Record<Address, SigningType>>((acc, info) => {
  //     acc[info.address] = info.signingType;
  //
  //     return acc;
  //   }, {});
  // }, [stakeInfo.length]);
  //
  // const getDisabled = (address: Address, signingType: SigningType): boolean => {
  //   if (signingType === SigningType.WATCH_ONLY) return false;
  //   if (!selectedStakes.length) return true;
  //
  //   const activeSigningType = signingTypeMap[selectedStakes[0]];
  //
  //   const passOnlyParitySigner =
  //     activeSigningType === SigningType.PARITY_SIGNER && signingType === SigningType.PARITY_SIGNER;
  //   const passOnlyOneMultisig = activeSigningType === SigningType.MULTISIG && address === selectedStakes[0];
  //
  //   return passOnlyParitySigner || passOnlyOneMultisig;
  // };
  //
  // return (
  //   <Table
  //     className="my-5 shadow-surface"
  //     by="address"
  //     dataSource={stakeInfo}
  //     selectedKeys={selectedStakes}
  //     onSelect={selectStaking}
  //   >
  //     <Table.Header>
  //       <Table.Column dataKey="accountName" align="left">
  //         {t('staking.overview.accountTableHeader')}
  //       </Table.Column>
  //       <Table.Column dataKey="totalReward" width={150}>
  //         {t('staking.overview.rewardsTableHeader')}
  //       </Table.Column>
  //       <Table.Column
  //         dataKey="totalStake"
  //         width={150}
  //         defaultSort="desc"
  //         sortable={(a, b) => bigNumberSorter(a.totalStake, b.totalStake)}
  //       >
  //         {t('staking.overview.stakeTableHeader')}
  //       </Table.Column>
  //       <Table.Column dataKey="actions" width={50} />
  //     </Table.Header>
  //     <Table.Body<AccountStakeInfo>>
  //       {(stake) => (
  //         <Table.Row
  //           className="bg-shade-1"
  //           key={stake.address}
  //           selectable={getDisabled(stake.address, stake.signingType)}
  //         >
  //           <Table.Cell>
  //             <div className="grid grid-flow-col gap-x-1">
  //               <Identicon className="row-span-2 self-center" address={stake.address} background={false} />
  //               <p className="text-neutral text-sm font-semibold">{stake.accountName}</p>
  //               {stake.walletName && <p className="text-neutral-variant text-2xs">{stake.walletName}</p>}
  //
  //               {stake.unlocking &&
  //                 stake.unlocking.length > 0 &&
  //                 getNextUnstaking(stake.unlocking, Number(currentEra)) && (
  //                   <div className="row-span-2 self-center">
  //                     <Popover
  //                       titleIcon={<Icon name="unstake" size={14} />}
  //                       titleText={t('staking.badges.unstakeTitle')}
  //                       content={t('staking.badges.unstakeDescription')}
  //                     >
  //                       <div className="flex gap-1 items-center rounded-2lg bg-primary-variant text-on-primary-variant text-2xs px-2 py-0.5">
  //                         <Icon name="unstake" size={14} />
  //                         <TimeToEra
  //                           api={api}
  //                           era={Number(getNextUnstaking(stake.unlocking, Number(currentEra))?.era)}
  //                         />
  //                       </div>
  //                     </Popover>
  //                   </div>
  //                 )}
  //             </div>
  //           </Table.Cell>
  //           <Table.Cell>
  //             {stake.totalReward === undefined || !asset ? (
  //               <Shimmering width={140} height={14} />
  //             ) : (
  //               <Balance
  //                 className="text-xs font-semibold"
  //                 value={stake.totalReward}
  //                 precision={asset.precision}
  //                 symbol={asset.symbol}
  //               />
  //             )}
  //           </Table.Cell>
  //           <Table.Cell>
  //             {stake.totalStake === undefined || !asset ? (
  //               <Shimmering width={140} height={14} />
  //             ) : (
  //               <Balance
  //                 className="text-xs font-semibold"
  //                 value={stake.totalStake}
  //                 precision={asset.precision}
  //                 symbol={asset.symbol}
  //               />
  //             )}
  //           </Table.Cell>
  //           <Table.Cell>
  //             <Explorers
  //               className="ml-3"
  //               address={stake.address}
  //               addressPrefix={addressPrefix}
  //               explorers={explorers}
  //               header={
  //                 stake.stash && (
  //                   <div className="flex gap-x-2.5">
  //                     <Icon name="network" size={20} />
  //                     <button type="button" onClick={() => openValidators(stake.stash)}>
  //                       {t('staking.overview.viewValidatorsOption')}
  //                     </button>
  //                   </div>
  //                 )
  //               }
  //             />
  //           </Table.Cell>
  //         </Table.Row>
  //       )}
  //     </Table.Body>
  //   </Table>
  // );
};

export default StakingList;
