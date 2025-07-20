import { removeProxyModel } from './model/remove-proxy-model';
import { RemovePureProxy } from './ui/RemoveProxy';

export const proxyRemovePureFeature = {
  views: { RemovePureProxy },
  models: { removePureProxy: removeProxyModel },
};
