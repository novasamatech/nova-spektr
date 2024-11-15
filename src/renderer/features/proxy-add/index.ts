import { addProxyModel } from './model/add-proxy-model';
import { AddProxy } from './ui/AddProxy';

export const proxyAddFeature = {
  views: {
    AddProxy,
  },
  models: {
    addProxy: addProxyModel,
  },
};
