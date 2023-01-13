import { ApolloClient, ApolloProvider, from, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';

type GraphqlContextProps = {
  changeClient: (chainId: ChainId) => void;
};

const GraphqlContext = createContext<GraphqlContextProps>({} as GraphqlContextProps);

const errorLink = onError(({ graphQLErrors, networkError }) => {
  graphQLErrors?.forEach(({ message, locations, path }) => {
    console.group('[GraphQL error]');
    console.log('Message: ', message);
    console.log('Location: ', locations);
    console.log('Path: ', path);
    console.groupEnd();
  });

  if (networkError) {
    console.log(`[Network error]:`, networkError);
  }
});

export const GraphqlProvider = ({ children }: PropsWithChildren) => {
  const { getStakingChainsData } = useChains();
  const { getStakingNetwork } = useSettingsStorage();

  const chainUrls = useRef<Record<ChainId, string>>({});
  const [apolloClient, setApolloClient] = useState<ApolloClient<NormalizedCacheObject>>();

  const changeClient = (chainId: ChainId) => {
    const httpLink = new HttpLink({ uri: chainUrls.current[chainId] });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: from([errorLink, httpLink]),
    });

    setApolloClient(client);
  };

  useEffect(() => {
    (async () => {
      const chainsData = await getStakingChainsData();

      chainUrls.current = chainsData.reduce((acc, chain) => {
        return { ...acc, [chain.chainId]: chain.externalApi?.staking.find((api) => api.type == 'subquery')?.url };
      }, {});

      changeClient(getStakingNetwork());
    })();
  }, []);

  if (!apolloClient) {
    return null;
  }

  return (
    <GraphqlContext.Provider value={{ changeClient }}>
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </GraphqlContext.Provider>
  );
};

export const useGraphql = () => useContext<GraphqlContextProps>(GraphqlContext);
