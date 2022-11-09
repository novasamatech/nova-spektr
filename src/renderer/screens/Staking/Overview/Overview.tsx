import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ButtonBack, Dropdown, Icon, Identicon, Input } from '@renderer/components/ui';
import { DropdownOption } from '@renderer/components/ui/Dropdown/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { useChains } from '@renderer/services/network/chainsService';
import useStaking from '@renderer/services/staking/stakingService';
import { useWallet } from '@renderer/services/wallet/walletService';

const Overview = () => {
  const { t } = useI18n();
  // @ts-ignore
  const { staking } = useStaking();
  const { getChainsData, sortChains } = useChains();
  const { getActiveWallets } = useWallet();

  const [query, setQuery] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<DropdownOption<ChainId>>();
  const [stakingNetworks, setStakingNetworks] = useState<DropdownOption<ChainId>[]>([]);

  useEffect(() => {
    (async () => {
      const chainsData = await getChainsData();
      const relaychains = chainsData.filter((chain) =>
        chain.assets.some((asset) => asset.staking === StakingType.RELAYCHAIN),
      );
      const sortGenesisHashes = sortChains(relaychains).map((chain) => ({
        prefix: <img src={chain.icon} alt={`${chain.name} icon`} width={20} height={20} />,
        label: chain.name,
        value: chain.chainId,
      }));
      setStakingNetworks(sortGenesisHashes);
      setActiveNetwork(sortGenesisHashes[0]);
    })();
  }, []);

  const activeWallets = getActiveWallets() || [];

  const formattedWallets = activeWallets?.reduce((acc, wallet) => {
    if (!wallet.name.toLowerCase().includes(query.toLowerCase())) return acc;

    const isParentWallet = wallet.parentWalletId === undefined;
    if (isParentWallet) {
      return acc.concat({ name: wallet.name, accountId: wallet.mainAccounts[0]?.accountId });
    }

    const isRelevantDerived = wallet.chainAccounts[0]?.chainId === activeNetwork?.value;
    if (isRelevantDerived) {
      acc.push({ name: wallet.name, accountId: wallet.chainAccounts[0]?.accountId });
    }

    return acc;
  }, [] as { name: string; accountId: AccountID }[]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
      </div>
      <div className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg">
        <div className="flex gap-x-5">
          <Input
            wrapperClass="!bg-shade-5 w-[300px]"
            placeholder={t('staking.overview.searchPlaceholder')}
            prefixElement={<Icon name="search" className="w-5 h-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Dropdown
            className="w-40"
            placeholder={t('staking.startStaking.selectNetworkLabel')}
            selected={activeNetwork}
            options={stakingNetworks}
            onSelected={setActiveNetwork}
          />
        </div>
        {activeWallets.length === 0 && (
          <div className="flex flex-col items-center mx-auto pt-12 pb-15">
            <Icon as="img" name="noResultVar2" size={300} />
            <p className="text-center text-2xl font-bold leading-7 text-neutral">
              {t('staking.overview.noActiveWalletsLabel')}
            </p>
            <p className="text-center text-base text-neutral-variant">
              {t('staking.overview.noActiveWalletsDescription')}
            </p>
          </div>
        )}
        {activeWallets.length > 0 && formattedWallets.length === 0 && (
          <div className="flex flex-col items-center mx-auto pt-12 pb-15">
            <Icon as="img" name="noResultVar2" size={300} />
            <p className="text-center text-2xl font-bold leading-7 text-neutral">
              {t('staking.overview.noResultsLabel')}
            </p>
            <p className="text-center text-base text-neutral-variant">{t('staking.overview.noResultsDescription')}</p>
          </div>
        )}
        {formattedWallets.length > 0 && (
          <ul className="flex gap-5 flex-wrap mt-5">
            {formattedWallets?.map((wallet, index) => (
              <li key={index}>
                <div className="relative w-[200px] rounded-2lg bg-white shadow-element">
                  <div className="absolute flex gap-x-2.5 w-full p-2.5 rounded-2lg bg-primary text-white">
                    <Identicon theme="polkadot" address={wallet.accountId} size={46} />
                    <p className="text-lg">{wallet.name}</p>
                  </div>
                  <div className="p-2.5 pt-[66px] rounded-2lg bg-tertiary text-white">Your rewards - 100</div>
                  <div className="flex flex-col items-center p-2.5">
                    <p>You stake 300 DOTS</p>
                    <div className="flex gap-x-2.5">
                      <Link className="bg-error rounded-lg py-1 px-2 text-white" to={Paths.UNBOND}>
                        Unbond
                      </Link>
                      <Link className="bg-primary rounded-lg py-1 px-2 text-white" to={Paths.STAKING_START}>
                        Bond
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Overview;
