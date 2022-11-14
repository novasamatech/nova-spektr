import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getShortAddress } from '@renderer/utils/strings';
import wallets from '@renderer/components/layout/PrimaryLayout/Wallets/Wallets';
import { ButtonBack, Dropdown, Icon, Identicon, Input } from '@renderer/components/ui';
import { DropdownOption } from '@renderer/components/ui/Dropdown/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { formatBalance } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { useStaking } from '@renderer/services/staking/stakingService';
import { useWallet } from '@renderer/services/wallet/walletService';

type NetworkOption = DropdownOption<{ chainId: ChainId; asset: Asset }>;

const Overview = () => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();
  const { sortChains, getChainsData } = useChains();
  const { getActiveWallets } = useWallet();

  const [query, setQuery] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<NetworkOption>();
  const [stakingNetworks, setStakingNetworks] = useState<NetworkOption[]>([]);

  const chainId = activeNetwork?.value.chainId || ('' as ChainId);
  const api = connections[chainId]?.api;

  const { staking, getLedger, getNominators } = useStaking(chainId, api);

  const activeWallets = getActiveWallets();

  useEffect(() => {
    const setupAvailableNetworks = async () => {
      const chainsData = await getChainsData();
      const relaychains = chainsData.reduce((acc, { chainId, name, icon, assets }) => {
        const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
        if (!asset) return acc;

        return acc.concat([{ chainId, icon, name, asset }]);
      }, [] as { chainId: ChainId; icon: string; name: string; asset: Asset }[]);

      const sortGenesisHashes = sortChains(relaychains).map(({ chainId, name, icon, asset }) => ({
        prefix: <img src={icon} alt={`${name} icon`} width={20} height={20} />,
        label: name,
        value: { chainId, asset },
      }));
      setStakingNetworks(sortGenesisHashes);
      setActiveNetwork(sortGenesisHashes[0]);
    };

    setupAvailableNetworks();
  }, []);

  useEffect(() => {
    if (!api || !activeWallets) return;

    const accounts = activeWallets.map(
      (wallet) => wallet.mainAccounts[0]?.accountId || wallet.chainAccounts[0]?.accountId,
    );
    getLedger(accounts);
  }, [activeWallets, api]);

  const formattedWallets = (activeWallets || [])?.reduce((acc, wallet) => {
    // TODO: maybe add staking here
    if (!wallet.name.toLowerCase().includes(query.toLowerCase())) return acc;

    const isParentWallet = wallet.parentWalletId === undefined;
    if (isParentWallet) {
      return acc.concat({ name: wallet.name, accountId: wallet.mainAccounts[0]?.accountId });
    }

    const isRelevantDerived = wallet.chainAccounts[0]?.chainId === activeNetwork?.value.chainId;
    if (isRelevantDerived) {
      acc.push({ name: wallet.name, accountId: wallet.chainAccounts[0]?.accountId });
    }

    return acc;
  }, [] as { name: string; accountId: AccountID }[]);

  const nominators = async (account: AccountID) => {
    const nominators = await getNominators(account);
    console.log(account, ' my nominators - ', nominators);
  };

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
        {wallets.length === 0 && (
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
        {wallets.length > 0 && formattedWallets.length === 0 && (
          <div className="flex flex-col items-center mx-auto pt-12 pb-15">
            <Icon as="img" name="noResultVar2" size={300} />
            <p className="text-center text-2xl font-bold leading-7 text-neutral">
              {t('staking.overview.noResultsLabel')}
            </p>
            <p className="text-center text-base text-neutral-variant">{t('staking.overview.noResultsDescription')}</p>
          </div>
        )}
        {formattedWallets.length > 0 && Object.values(staking).length > 0 && (
          <ul className="flex gap-5 flex-wrap mt-5">
            {formattedWallets?.map((wallet, index) => (
              <li key={index}>
                <div className="relative w-[200px] rounded-2lg bg-white shadow-element">
                  <div className="absolute flex gap-x-2.5 w-full p-2.5 rounded-2lg bg-primary text-white">
                    <Identicon theme="polkadot" address={wallet.accountId} size={46} />
                    <p className="text-lg">{wallet.name}</p>
                  </div>
                  <div className="p-2.5 pt-[66px] rounded-2lg bg-tertiary text-white">
                    <p className="text-xs">Stash - {getShortAddress(staking[wallet.accountId]?.stash, 10) || 'NONE'}</p>
                    <p className="text-xs">
                      Controller - {getShortAddress(staking[wallet.accountId]?.controller, 10) || 'NONE'}
                    </p>
                  </div>
                  {staking[wallet.accountId] ? (
                    <div className="flex flex-col items-center p-2.5">
                      <p className="text-shade-40">Your total stake</p>
                      <p className="font-bold text-lg">
                        {formatBalance(staking[wallet.accountId]?.total, activeNetwork?.value.asset.precision).value}{' '}
                        {activeNetwork?.value.asset.symbol}
                      </p>
                      <p className="text-shade-40">Your active stake</p>
                      <p className="font-bold text-lg">
                        {formatBalance(staking[wallet.accountId]?.active, activeNetwork?.value.asset.precision).value}{' '}
                        {activeNetwork?.value.asset.symbol}
                      </p>
                      {staking[wallet.accountId]!.unlocking.length > 0 && (
                        <>
                          <p className="text-shade-40">Unbonding</p>
                          {staking[wallet.accountId]?.unlocking.map(({ value, era }) => (
                            <p key={era} className="font-bold text-lg">
                              {era} - {formatBalance(value, activeNetwork?.value.asset.precision).value}{' '}
                              {activeNetwork?.value.asset.symbol}
                            </p>
                          ))}
                        </>
                      )}
                      <button
                        className="text-sm bg-shade-10 border-2 border-shade-20 px-1"
                        onClick={() => nominators(wallet.accountId)}
                      >
                        log nominators
                      </button>
                      <div className="flex gap-x-2.5 mt-2">
                        <Link className="bg-error rounded-lg py-1 px-2 text-white" to={Paths.UNBOND}>
                          Unbond
                        </Link>
                        <Link className="bg-primary rounded-lg py-1 px-2 text-white" to={Paths.STAKING_START}>
                          Bond
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-y-2 p-2.5">
                      <p>Start staking</p>
                      <Link className="bg-primary rounded-lg mt-2 py-1 px-2 text-white" to={Paths.STAKING_START}>
                        Bond
                      </Link>
                    </div>
                  )}
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
