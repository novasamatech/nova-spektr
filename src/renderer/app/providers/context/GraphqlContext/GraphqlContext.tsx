import { ApolloClient, ApolloProvider, from, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { chainsService } from '@shared/api/network';
import { useSettingsStorage } from '@entities/settings';
import type { ChainId } from '@shared/core';

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
  const { getStakingNetwork } = useSettingsStorage();

  const chainUrls = useRef<Record<ChainId, string>>({});
  const [apolloClient, setApolloClient] = useState<ApolloClient<NormalizedCacheObject>>();

  const changeClient = useCallback((chainId: ChainId) => {
    const httpLink = new HttpLink({ uri: chainUrls.current[chainId] });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: from([errorLink, httpLink]),
    });

    setApolloClient(client);
  }, []);

  useEffect(() => {
    const chainsData = chainsService.getStakingChainsData();

    chainUrls.current = chainsData.reduce((acc, chain) => {
      const subqueryMatch = chain.externalApi?.staking.find((api) => api.type === 'subquery');

      if (subqueryMatch) {
        return { ...acc, [chain.chainId]: subqueryMatch.url };
      }

      console.warn(`${chain.name} doesn't contain Subquery URL`);

      return acc;
    }, {});

    changeClient(getStakingNetwork());
  }, []);

  const value = useMemo(() => ({ changeClient }), [changeClient]);

  if (!apolloClient) {
    return null;
  }

  return (
    <GraphqlContext.Provider value={value}>
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </GraphqlContext.Provider>
  );
};

export const useGraphql = () => useContext<GraphqlContextProps>(GraphqlContext);
