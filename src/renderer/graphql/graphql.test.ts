import createApolloClient from './index';
import 'whatwg-fetch';

describe('graphql', () => {
  test('should return apolloClient', () => {
    expect(createApolloClient().version).toBeDefined();
  });
});
