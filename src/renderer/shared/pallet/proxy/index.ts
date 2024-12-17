import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const proxyPallet = {
  consts,
  schema,
  storage,
};

export type { KitchensinkRuntimeProxyType, ProxyProxyDefinition, ProxyAnnouncement } from './schema';
