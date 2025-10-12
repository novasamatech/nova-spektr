import { createContainer, createIframeProvider } from '@novasamatech/spektr-dapp-host-container';
import { type SignerPayloadJSON, type SignerResult } from '@polkadot/types/types';
import { useUnit } from 'effector-react';
import { getWsProvider } from 'polkadot-api/ws-provider';
import { useLayoutEffect, useState } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import {
  type PromiseWithResolvers,
  RelayChains,
  cnTw,
  isEthereumAccountId,
  nonNullable,
  promiseWithResolvers,
  toAddress,
} from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon } from '@/shared/ui';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { DAPP_LIST } from '../constants';

import { SignCustomPayloadModal } from './SignCustomPayloadModal';

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
  const allChains = useUnit(networkModel.$chains);

  const [signRequest, setSignRequest] = useState<SignerPayloadJSON | null>(null);
  const [signRequestPromise, setSignRequestPromise] = useState<PromiseWithResolvers<SignerResult> | null>(null);
  const [url, setUrl] = useState<string>('');
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const config = DAPP_LIST.find((x) => x.id === id);

  useLayoutEffect(() => {
    if (!config) return;
    if (!iframe) return;
    if (!Object.keys(allChains).length) return;

    const iframeContainer = createIframeProvider(iframe, config.link);
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

    container.handleSignRequest({
      signRaw() {
        return Promise.reject(new Error('Signing raw payload is not implemented.'));
      },
      signPayload(payload) {
        const resolver = promiseWithResolvers<SignerResult>();
        setSignRequest(payload);
        setSignRequestPromise(resolver);
        return resolver.promise;
      },
    });

    container.handleChainSupportCheck((chainId) => chainId in allChains);

    container.handleLocationChange((location) => {
      setUrl(location);
    });

    const polkadotChain = allChains[RelayChains.POLKADOT];
    const provider = polkadotChain ? getWsProvider(polkadotChain.nodes.map((n) => n.url)) : null;
    if (provider) {
      container.connectToPapiProvider(RelayChains.POLKADOT, provider);
    }

    return () => {
      container.dispose();
      setSignRequest(null);
      setUrl('');
    };
  }, [config, iframe, allChains]);

  const hasOverlay = nonNullable(signRequest);
  const hasSecureConnection = config?.link.startsWith('https://') ?? false;

  return (
    <div className="h-full w-full overflow-hidden p-2">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg shadow-sm">
        {nonNullable(config) && (
          <div className="relative z-5 flex h-10 shrink-0 items-center justify-between gap-1 bg-white px-4">
            <div className="flex items-center gap-2">{hasSecureConnection && <Icon name="lock" size={12} />}</div>

            <div className="absolute inset-0 m-auto flex h-full w-fit items-center gap-2">
              <img src={config.icon} className="h-5 w-5 object-contain" />
              <BodyText>{config.title}</BodyText>
              <FootnoteText>{url === '/' ? '' : url}</FootnoteText>
            </div>

            <div className="flex items-center gap-2"></div>
          </div>
        )}

        <iframe
          ref={setIframe}
          className={cnTw('h-full w-full grow appearance-none border-none transition-all', {
            'blur-[2px] grayscale-50': hasOverlay,
          })}
        />
      </div>
      {nonNullable(signRequest) && (
        <SignCustomPayloadModal
          payload={signRequest}
          onResult={(result) => {
            if (signRequestPromise) {
              signRequestPromise.resolve(result);
            }
            setSignRequestPromise(null);
            setSignRequest(null);
          }}
          onCancel={(reason) => {
            if (signRequestPromise) {
              signRequestPromise.reject(new Error(reason));
            }
            setSignRequestPromise(null);
            setSignRequest(null);
          }}
        />
      )}
    </div>
  );
};
