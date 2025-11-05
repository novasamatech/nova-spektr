import { identityResource } from './resource';

export const identity = {
  $list: identityResource.$cache,
  resource: identityResource,
  request: identityResource.fetch,
};
