import { type PolkadotApi } from '@/domains/network';

type ExtractedApi<T extends PolkadotApi['type']> = Extract<PolkadotApi, { type: T }>;

export function getTypedApis<T extends readonly PolkadotApi['type'][], K>(
  papi: PolkadotApi,
  types: T,
  cb: (api: ExtractedApi<T[number]>) => K,
): K {
  if (!types.includes(papi.type as T[number])) {
    throw new Error(`API type mismatch. Expected one of ${types.join(', ')}, got ${papi.type}`);
  }

  return cb(papi as ExtractedApi<T[number]>);
}
