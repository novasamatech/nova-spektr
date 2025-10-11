import { createContainer, createIframeProvider } from '@novasamatech/spektr-dapp-host-container';
import { useUnit } from 'effector-react';
import { getWsProvider } from 'polkadot-api/ws-provider';
import { useLayoutEffect, useState } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { RelayChains, isEthereumAccountId, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { DAPP_LIST } from '../constants';

function anyAccountToInjectedAccount(account: AnyAccount, chains: Record<ChainId, Chain>) {
  const chain = accountService.isChainAccount(account) ? chains[account.chainId] : null;

  return {
    name: account.name,
    address: toAddress(account.accountId, { prefix: chain?.addressPrefix }),
    genesisHash: chain?.chainId,
    type: isEthereumAccountId(account.accountId) ? ('ecdsa' as const) : ('sr25519' as const),
  };
}

type Props = {
  id: string;
};

export const DappContainer = ({ id }: Props) => {
  const [iframeNode, setIframeNode] = useState<HTMLIFrameElement | null>(null);
  const config = DAPP_LIST.find((x) => x.id === id);
  const allChains = useUnit(networkModel.$chains);

  useLayoutEffect(() => {
    if (!config) return;
    if (!iframeNode) return;
    if (!Object.keys(allChains).length) return;

    const iframeContainer = createIframeProvider(iframeNode, config.link);
    const container = createContainer(iframeContainer);

    container.handleAccounts({
      async get() {
        // eslint-disable-next-line effector/no-getState
        const allAccounts = accounts.$list.getState();

        return allAccounts.map((account) => anyAccountToInjectedAccount(account, allChains));
      },
      subscribe(callback) {
        return accounts.$list.subscribe((allAccounts) => {
          const injectedAccounts = allAccounts.map((account) => anyAccountToInjectedAccount(account, allChains));

          callback(injectedAccounts);
        });
      },
    });

    const polkadotChain = allChains[RelayChains.POLKADOT];
    const provider = polkadotChain ? getWsProvider(polkadotChain.nodes.map((n) => n.url)) : null;
    if (provider) {
      container.connectToPapiProvider(RelayChains.POLKADOT, provider);
    }

    return container.dispose;
  }, [config, iframeNode, allChains]);

  return (
    <div className="h-full w-full overflow-hidden">
      <iframe ref={setIframeNode} className="h-full w-full appearance-none border-none" />
    </div>
  );
};
