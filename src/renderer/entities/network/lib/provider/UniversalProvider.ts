import {
  ProviderInterface,
  ProviderInterfaceCallback,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
} from '@polkadot/rpc-provider/types';

import { ProviderType } from '../common/types';

export class UniversalProvider implements ProviderInterface {
  private wsProvider: ProviderInterface;
  private scProvider?: ProviderInterface;

  private provider: ProviderInterface;

  constructor(wsProvider: ProviderInterface, scProvider?: ProviderInterface) {
    this.wsProvider = wsProvider;
    this.scProvider = scProvider;

    this.provider = wsProvider;
  }

  public setProviderType(providerType: ProviderType) {
    this.provider = providerType === ProviderType.WEB_SOCKET || !this.scProvider ? this.wsProvider : this.scProvider;
  }

  get hasSubscriptions() {
    return this.provider.hasSubscriptions;
  }

  get isClonable() {
    return this.provider.isClonable;
  }

  get isConnected() {
    return this.provider.isConnected;
  }

  get stats() {
    return this.provider.stats || undefined;
  }

  public clone(): ProviderInterface {
    return this.provider.clone();
  }

  public connect(): Promise<void> {
    return this.provider.connect();
  }

  public disconnect(): Promise<void> {
    return this.provider.disconnect();
  }

  public on(type: ProviderInterfaceEmitted, sub: ProviderInterfaceEmitCb): () => void {
    return this.provider.on(type, sub);
  }

  public send<T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T> {
    return this.provider.send(method, params, isCacheable);
  }

  public subscribe(
    type: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback,
  ): Promise<number | string> {
    return this.provider.subscribe(type, method, params, cb);
  }

  public unsubscribe(type: string, method: string, id: number | string): Promise<boolean> {
    return this.provider.unsubscribe(type, method, id);
  }
}
