import { removeProxyModel } from './model/remove-proxy-model';
import { RemoveProxy } from './ui/RemoveProxy';

export const proxyRemoveFeature = {
  views: {
    RemoveProxy,
  },
  models: {
    removeProxy: removeProxyModel,
  },
};
