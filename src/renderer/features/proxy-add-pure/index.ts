import { addPureProxiedModel } from './model/add-pure-proxied-model';
import { AddPureProxied } from './ui/AddPureProxied';

export const proxyAddPureFeature = {
  views: {
    AddPureProxied,
  },
  models: {
    addPureProxied: addPureProxiedModel,
  },
};
