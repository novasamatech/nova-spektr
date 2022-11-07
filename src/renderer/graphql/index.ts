import { onError } from '@apollo/client/link/error';
import { ApolloClient, from, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';

const SubQueryAPI = 'https://nova-wallet-polkadot.gapi.subquery.network';

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

const createApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  const httpLink = new HttpLink({ uri: SubQueryAPI });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: from([errorLink, httpLink]),
  });
};

export default createApolloClient;
