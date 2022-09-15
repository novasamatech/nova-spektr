import { ApiPromise } from '@polkadot/api/promise';
import { WsProvider } from '@polkadot/rpc-provider';

export async function createWsConnection(url: string): Promise<ApiPromise> {
  const provider = new WsProvider(url);

  return ApiPromise.create({ provider });
}
