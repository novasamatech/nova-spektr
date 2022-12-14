import { ApolloClient, ApolloProvider, from, HttpLink, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

import { useSettingsStorage } from '@renderer/services/settings/settingsStorage';
import { ChainId } from '@renderer/domain/shared-kernel';

type GraphqlContextProps = {
  setGraphqlEndpoint: (chainId: ChainId) => void;
};

const GraphqlContext = createContext<GraphqlContextProps>({} as GraphqlContextProps);

const SubQueryAPI: Record<ChainId, string> = {
  '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3':
    'https://nova-wallet-polkadot.gapi.subquery.network',
  '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe':
    'https://nova-wallet-kusama.gapi.subquery.network',
  '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e':
    'https://nova-wallet-westend.gapi.subquery.network',
};

export const GraphqlProvider = ({ children }: PropsWithChildren) => {
  const { getStakingNetwork } = useSettingsStorage();
  const [activeChain, setActiveChain] = useState<ChainId>(getStakingNetwork());

  const setGraphqlEndpoint = (chainId: ChainId) => {
    setActiveChain(chainId);
  };

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

  const createClient = () => {
    const httpLink = new HttpLink({ uri: SubQueryAPI[activeChain] });

    return new ApolloClient({
      cache: new InMemoryCache(),
      link: from([errorLink, httpLink]),
    });
  };

  return (
    <GraphqlContext.Provider value={{ setGraphqlEndpoint }}>
      <ApolloProvider client={createClient()}>{children}</ApolloProvider>
    </GraphqlContext.Provider>
  );
};

export const useGraphql = () => useContext<GraphqlContextProps>(GraphqlContext);
