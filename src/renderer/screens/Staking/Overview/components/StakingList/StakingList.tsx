import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  test?: string;
};

const StakingList = ({ test }: Props) => {
  const { t } = useI18n();

  return <div>{t('staking.overview.stakingAssetLabel')}</div>;

  // TODO: Continue during StakingList
  // return (
  //   <div>
  //     {wallets.length === 0 && (
  //       <div className="flex flex-col items-center mx-auto pt-12 pb-15">
  //         <Icon as="img" name="noWallets" size={300} />
  //         <p className="text-center text-2xl font-bold leading-7 text-neutral">
  //           {t('staking.overview.noActiveWalletsLabel')}
  //         </p>
  //         <p className="text-center text-base text-neutral-variant">
  //           {t('staking.overview.noActiveWalletsDescription')}
  //         </p>
  //       </div>
  //     )}
  //     {wallets.length > 0 && formattedWallets.length === 0 && (
  //       <div className="flex flex-col items-center mx-auto pt-12 pb-15">
  //         <Icon as="img" name="noWallets" size={300} />
  //         <p className="text-center text-2xl font-bold leading-7 text-neutral">
  //           {t('staking.overview.noResultsLabel')}
  //         </p>
  //         <p className="text-center text-base text-neutral-variant">{t('staking.overview.noResultsDescription')}</p>
  //       </div>
  //     )}
  //     {formattedWallets.length > 0 && Object.values(staking).length > 0 && (
  //       <ul className="flex gap-5 flex-wrap mt-5">
  //         {formattedWallets?.map((wallet) => (
  //           <li key={wallet.accountId}>
  //             <div className="relative w-[200px] rounded-2lg bg-white shadow-element">
  //               <div className="absolute flex gap-x-2.5 w-full p-2.5 rounded-2lg bg-primary text-white">
  //                 <Identicon theme="polkadot" address={wallet.accountId} size={46} />
  //                 <p className="text-lg">{wallet.name}</p>
  //               </div>
  //               <div className="p-2.5 pt-[66px] rounded-2lg bg-tertiary text-white">
  //                 <div className="text-xs">
  //                   S - <Address address={staking[wallet.accountId]?.stash || ''} type="short" />
  //                 </div>
  //                 <div className="text-xs">
  //                   C - <Address address={staking[wallet.accountId]?.controller || ''} type="short" />
  //                 </div>
  //               </div>
  //               {staking[wallet.accountId] ? (
  //                 <div className="flex flex-col items-center p-2.5">
  //                   <p className="text-shade-40">Your total stake</p>
  //                   <p className="font-bold text-lg">
  //                     {formatBalance(staking[wallet.accountId]?.total, activeNetwork?.value.asset.precision).value}{' '}
  //                     {activeNetwork?.value.asset.symbol}
  //                   </p>
  //                   <p className="text-shade-40">Your active stake</p>
  //                   <p className="font-bold text-lg">
  //                     {formatBalance(staking[wallet.accountId]?.active, activeNetwork?.value.asset.precision).value}{' '}
  //                     {activeNetwork?.value.asset.symbol}
  //                   </p>
  //                   {staking[wallet.accountId]!.unlocking.length > 0 && (
  //                     <>
  //                       <p className="text-shade-40">Unbonding</p>
  //                       {staking[wallet.accountId]?.unlocking.map(({ value, era }) => (
  //                         <p key={era} className="font-bold text-lg">
  //                           {era} - {formatBalance(value, activeNetwork?.value.asset.precision).value}{' '}
  //                           {activeNetwork?.value.asset.symbol}
  //                         </p>
  //                       ))}
  //                     </>
  //                   )}
  //                   <button
  //                     className="text-sm bg-shade-10 border-2 border-shade-20 px-1"
  //                     onClick={() => nominators(wallet.accountId)}
  //                   >
  //                     log nominators
  //                   </button>
  //                   <div className="flex gap-x-2.5 mt-2">
  //                     <Link className="bg-error rounded-lg py-1 px-2 text-white" to={Paths.UNBOND}>
  //                       Unbond
  //                     </Link>
  //                     <Link
  //                       className="bg-primary rounded-lg py-1 px-2 text-white"
  //                       to={createLink('STAKING_START', { chainId })}
  //                     >
  //                       Bond
  //                     </Link>
  //                   </div>
  //                 </div>
  //               ) : (
  //                 <div className="flex flex-col items-center gap-y-2 p-2.5">
  //                   <p>Start staking</p>
  //                   <Link
  //                     className="bg-primary rounded-lg mt-2 py-1 px-2 text-white"
  //                     to={createLink('STAKING_START', { chainId })}
  //                   >
  //                     Bond
  //                   </Link>
  //                 </div>
  //               )}
  //             </div>
  //           </li>
  //         ))}
  //       </ul>
  //     )}
  //   </div>
  // );
};

export default StakingList;
