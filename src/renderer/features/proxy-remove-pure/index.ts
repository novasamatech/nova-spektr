import { removePureProxyModel } from './model/remove-pure-proxy-model';
import { RemovePureProxy } from './ui/RemovePureProxy';

export const proxyRemovePureFeature = {
  views: { RemovePureProxy },
  models: { removePureProxy: removePureProxyModel },
};
