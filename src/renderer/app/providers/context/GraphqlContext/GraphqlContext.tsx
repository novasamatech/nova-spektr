import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  type NormalizedCacheObject,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { localStorageService } from '@/shared/api/local-storage';
import { chainsService } from '@/shared/api/network';
import { type ChainId, ExternalType } from '@/shared/core';
import { DEFAULT_STAKING_CHAIN, STAKING_NETWORK } from '@/entities/staking';

type GraphqlContextProps = {
  changeClient: (chainId: ChainId) => void;
};

const GraphqlContext = createContext<GraphqlContextProps>({} as GraphqlContextProps);

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const { message, locations, path } of graphQLErrors) {
      console.group('[GraphQL error]');
      console.log('Message: ', message);
      console.log('Location: ', locations);
      console.log('Path: ', path);
      console.groupEnd();
    }
  }

  if (networkError) {
    console.log(`[Network error]:`, networkError);
  }
});

export const GraphqlProvider = ({ children }: PropsWithChildren) => {
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

    const result: Record<ChainId, string> = {};

    for (const chain of chainsData) {
      const subqueryMatch = chain.externalApi?.[ExternalType.STAKING]?.find((api) => api.type === 'subquery');
      if (!subqueryMatch) continue;

      result[chain.chainId] = subqueryMatch.url;
    }

    chainUrls.current = result;
  }, []);

  useEffect(() => {
    changeClient(localStorageService.getFromStorage(STAKING_NETWORK, DEFAULT_STAKING_CHAIN));
  }, []);

  const value = useMemo(() => ({ changeClient }), []);

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
