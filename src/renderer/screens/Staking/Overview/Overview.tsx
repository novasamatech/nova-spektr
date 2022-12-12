/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import wallets from '@renderer/components/layout/PrimaryLayout/Wallets/Wallets';
import { Address, ButtonBack, Dropdown, Icon, Identicon, Input } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { createLink } from '@renderer/routes/utils';
import { formatBalance } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { useStaking } from '@renderer/services/staking/stakingService';
import { useAccount } from '@renderer/services/account/accountService';

type ResultNetwork = ResultOption<{ chainId: ChainId; asset: Asset }>;
type DropdownNetwork = Option<{ chainId: ChainId; asset: Asset }>;

const Overview = () => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();
  const { sortChains, getChainsData } = useChains();
  const { getActiveAccounts } = useAccount();

  const [query, setQuery] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<ResultNetwork>();
  const [stakingNetworks, setStakingNetworks] = useState<DropdownNetwork[]>([]);

  const chainId = activeNetwork?.value.chainId || ('' as ChainId);
  const api = connections[chainId]?.api;

  const { staking, subscribeActiveEra, subscribeLedger, getNominators } = useStaking();

  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    const setupAvailableNetworks = async () => {
      const chainsData = await getChainsData();
      const relaychains = chainsData.reduce((acc, { chainId, name, icon, assets }) => {
        const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
        if (!asset) return acc;

        return acc.concat([{ chainId, icon, name, asset }]);
      }, [] as { chainId: ChainId; icon: string; name: string; asset: Asset }[]);

      const sortGenesisHashes = sortChains(relaychains).map(({ chainId, name, icon, asset }) => ({
        id: chainId,
        value: { chainId, asset },
        element: (
          <>
            <img src={icon} alt={`${name} icon`} width={20} height={20} />
            {name}
          </>
        ),
      }));

      setStakingNetworks(sortGenesisHashes);
      setActiveNetwork({ id: sortGenesisHashes[0].id, value: sortGenesisHashes[0].value });
    };

    setupAvailableNetworks();
  }, []);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    (async () => {
      await subscribeActiveEra(chainId, api);
    })();
  }, [api]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !activeAccounts) return;

    (async () => {
      const accounts = activeAccounts.reduce(
        (acc, account) => (account.accountId ? [...acc, account.accountId] : acc),
        [] as string[],
      );
      await subscribeLedger(chainId, api, accounts);
    })();
  }, [activeAccounts, api]);

  const formattedWallets = (activeAccounts || [])?.reduce((acc, account) => {
    // TODO: maybe add staking here
    if (!account.name.toLowerCase().includes(query.toLowerCase())) return acc;

    const isRootWallet = account.rootId === undefined;
    if (isRootWallet && account.accountId) {
      return acc.concat({ name: account.name, accountId: account.accountId });
    }

    const isRelevantDerived = account.chainId === activeNetwork?.value.chainId;

    if (isRelevantDerived && account.accountId) {
      acc.push({ name: account.name, accountId: account.accountId });
    }

    return acc;
  }, [] as { name: string; accountId: AccountID }[]);

  const nominators = async (account: AccountID) => {
    if (!api) return;

    const nominators = await getNominators(api, account);
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
            activeId={activeNetwork?.id}
            options={stakingNetworks}
            onChange={setActiveNetwork}
          />
        </div>
        {wallets.length === 0 && (
          <div className="flex flex-col items-center mx-auto pt-12 pb-15">
            <Icon as="img" name="noWallets" size={300} />
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
            <Icon as="img" name="noWallets" size={300} />
            <p className="text-center text-2xl font-bold leading-7 text-neutral">
              {t('staking.overview.noResultsLabel')}
            </p>
            <p className="text-center text-base text-neutral-variant">{t('staking.overview.noResultsDescription')}</p>
          </div>
        )}
        {formattedWallets.length > 0 && Object.values(staking).length > 0 && (
          <ul className="flex gap-5 flex-wrap mt-5">
            {formattedWallets?.map((wallet) => (
              <li key={wallet.accountId}>
                <div className="relative w-[200px] rounded-2lg bg-white shadow-element">
                  <div className="absolute flex gap-x-2.5 w-full p-2.5 rounded-2lg bg-primary text-white">
                    <Identicon theme="polkadot" address={wallet.accountId} size={46} />
                    <p className="text-lg">{wallet.name}</p>
                  </div>
                  <div className="p-2.5 pt-[66px] rounded-2lg bg-tertiary text-white">
                    <div className="text-xs">
                      S - <Address address={staking[wallet.accountId]?.stash || ''} type="short" />
                    </div>
                    <div className="text-xs">
                      C - <Address address={staking[wallet.accountId]?.controller || ''} type="short" />
                    </div>
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
                        <Link
                          className="bg-primary rounded-lg py-1 px-2 text-white"
                          to={createLink('STAKING_START', { chainId })}
                        >
                          Bond
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-y-2 p-2.5">
                      <p>Start staking</p>
                      <Link
                        className="bg-primary rounded-lg mt-2 py-1 px-2 text-white"
                        to={createLink('STAKING_START', { chainId })}
                      >
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
