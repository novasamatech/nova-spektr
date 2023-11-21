import {
  ProviderInterface,
  ProviderInterfaceCallback,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
} from '@polkadot/rpc-provider/types';

import { ProviderType, Subscription } from '../common/types';

export class UniversalProvider implements ProviderInterface {
  private wsProvider: ProviderInterface;
  private scProvider?: ProviderInterface;

  private provider: ProviderInterface;

  private subscriptions = new Map<number | string, Subscription>();
  private subscriptionIds = new Map<number | string, number | string>();

  constructor(wsProvider: ProviderInterface, scProvider?: ProviderInterface) {
    this.wsProvider = wsProvider;
    this.scProvider = scProvider;

    this.provider = wsProvider;
  }

  public async setProviderType(providerType: ProviderType) {
    const oldProvider = this.provider;
    const newProvider =
      providerType === ProviderType.WEB_SOCKET || !this.scProvider ? this.wsProvider : this.scProvider;

    if (oldProvider === newProvider) return;
    const subscriptions = [...this.subscriptions.values()];

    await oldProvider.disconnect();
    await newProvider.connect();

    this.provider = newProvider;

    for (let oldId in subscriptions) {
      const sub = this.subscriptions.get(oldId);
      if (!sub) return;

      const newId = await this.subscribe(sub.type, sub.method, sub.params, sub.cb);

      this.subscriptionIds.set(oldId, newId);
    }
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

  public async subscribe(
    type: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback,
  ): Promise<number | string> {
    const id = await this.provider.subscribe(type, method, params, cb);

    this.subscriptions.set(id, { type, method, params, cb });

    return id;
  }

  public unsubscribe(type: string, method: string, id: number | string): Promise<boolean> {
    const subId = this.subscriptionIds.get(id) || id;
    this.subscriptions.delete(subId);

    return this.provider.unsubscribe(type, method, subId);
  }
}
