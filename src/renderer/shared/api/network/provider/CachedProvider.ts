import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { isString } from 'lodash';
import mitt from 'mitt';

import { type ChainMetadata } from '@/shared/core';
import { scaleEncodedToNumber } from '@/shared/lib/utils';
import { type ProviderMetadata, type ProviderWithMetadata } from '../lib/types';

const LEGACY_METADATA_VERSION = 14;
const STATE_CALL_METHOD = 'state_call';

export function createCachedProvider(Provider: new (...args: any[]) => ProviderInterface, metadata?: ChainMetadata) {
  class CachedProvider extends Provider implements ProviderWithMetadata {
    private metadata: ProviderMetadata | null = metadata || null;
    private events = mitt<{ metadataReceived: ProviderMetadata }>();

    private updateMetadata(metadata: ProviderMetadata) {
      this.metadata = metadata;
      this.events.emit('metadataReceived', metadata);
    }

    onMetadataReceived(callback: (value: ProviderMetadata) => unknown): VoidFunction {
      this.events.on('metadataReceived', callback);

      return () => this.events.off('metadataReceived', callback);
    }

    stateCall(method: string, ...args: unknown[]) {
      return super.send(STATE_CALL_METHOD, [method, ...args]);
    }

    getRuntimeVersion() {
      return super.send('state_getRuntimeVersion', []);
    }

    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      const hasParams = params.length > 0;

      if (method === 'state_getMetadata' && !hasParams) {
        if (this.metadata) {
          return Promise.resolve(this.metadata.metadata);
        }

        const metadata = await super.send(method, params, ...args);
        const runtimeVersion = await this.getRuntimeVersion();

        this.updateMetadata({
          runtimeVersion: runtimeVersion.specVersion,
          metadataVersion: LEGACY_METADATA_VERSION,
          metadata,
        });

        return metadata;
      }

      if (method === STATE_CALL_METHOD && hasParams) {
        const [call, rawVersion] = params;

        if (call === 'Metadata_metadata_at_version') {
          const metadataVersion = isString(rawVersion) ? scaleEncodedToNumber(rawVersion) : 0;
          if (metadataVersion === this.metadata?.metadataVersion) {
            return Promise.resolve(this.metadata.metadata);
          }

          const metadata = await super.send(method, params, ...args);
          const runtimeVersion = await this.getRuntimeVersion();

          this.updateMetadata({
            runtimeVersion: runtimeVersion.specVersion,
            metadataVersion,
            metadata,
          });

          return metadata;
        }
      }

      return super.send(method, params, ...args);
    }
  }

  return CachedProvider;
}
