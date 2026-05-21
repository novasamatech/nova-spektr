import { verifyProxyModel } from './model/verify-proxy-model';
import { VerifyProxy } from './ui/VerifyProxy';

export const proxyVerifyFeature = {
  VerifyProxy,
  model: verifyProxyModel,
};

export { VerifyProxy, verifyProxyModel };
export { VERIFIABLE_PROXY_TYPES, buildVerifyProxyCall, isVerifiableProxyType } from './lib/build-verify-proxy';
