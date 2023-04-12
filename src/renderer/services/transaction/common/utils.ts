import { ApiPromise } from '@polkadot/api';
import { SpRuntimeDispatchError } from '@polkadot/types/lookup';

export const decodeDispatchError = (error: SpRuntimeDispatchError, api: ApiPromise): string => {
  let errorInfo = error.toString();

  if (error.isModule) {
    const decoded = api.registry.findMetaError(error.asModule);

    errorInfo = decoded.name
      .split(/(?=[A-Z])/)
      .map((w) => w.toLowerCase())
      .join(' ');
  }

  return errorInfo;
};
