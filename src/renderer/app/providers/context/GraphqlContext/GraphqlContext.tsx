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
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  type NormalizedCacheObject,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

import { type ChainId, ExternalType } from '@shared/core';
import { chainsService } from '@shared/api/network';
import { settingsStorage } from '@entities/settings';

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
    const stakingChainId = settingsStorage.getStakingNetwork();

    chainUrls.current = chainsData.reduce((acc, chain) => {
      const subqueryMatch = chain.externalApi?.[ExternalType.STAKING].find((api) => api.type === 'subquery');

      if (subqueryMatch) {
        return { ...acc, [chain.chainId]: subqueryMatch.url };
      }

      console.warn(`${chain.name} doesn't contain Subquery URL`);

      return acc;
    }, {});

    changeClient(stakingChainId);
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
