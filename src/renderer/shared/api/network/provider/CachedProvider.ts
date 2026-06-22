import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { isString } from 'lodash';
import mitt from 'mitt';

import { type ChainMetadata, type HexString } from '@/shared/core';
import { readSpecVersion, scaleEncodedToNumber } from '@/shared/lib/utils';
import { type ProviderMetadata, type ProviderWithMetadata } from '../lib/types';

const LEGACY_METADATA_VERSION = 14;
const STATE_CALL_METHOD = 'state_call';
const STATE_METADATA_METHOD = 'state_getMetadata';
const OPTION_SOME_BYTE = 0x01;

/**
 * Returns the SCALE-encoded `RuntimeMetadataPrefixed` bytes, unwrapping the
 * `Option<OpaqueMetadata>` envelope that `Metadata_metadata_at_version` adds
 * (Some => 0x01 + compact-length-prefixed metadata).
 */
function toRuntimeMetadataHex(metadataHex: HexString): HexString {
  const u8a = hexToU8a(metadataHex);

  if (u8a[0] !== OPTION_SOME_BYTE) {
    return metadataHex;
  }

  const [, metadataBytes] = compactStripLength(u8a.slice(1));

  return u8aToHex(metadataBytes);
}

export function createCachedProvider(Provider: new (...args: any[]) => ProviderInterface, metadata?: ChainMetadata) {
  class CachedProvider extends Provider implements ProviderWithMetadata {
    private metadata: ProviderMetadata | null = metadata || null;
    private events = mitt<{ metadataReceived: ProviderMetadata }>();
    // Decoding a metadata blob is expensive (full registry build), so memoize the
    // last result keyed by the bytes to avoid re-decoding on every cache check.
    private specVersionCache: { metadata: HexString; specVersion: number | null } | null = null;

    /**
     * Spec version decoded from the metadata BYTES (not a separately fetched
     * label). The label is set from a `state_getRuntimeVersion` call made apart
     * from the metadata fetch, so it can drift from the actual bytes during a
     * runtime upgrade — leaving a stale blob stamped with the new runtime
     * version that the cache would otherwise keep serving. Reading from the
     * bytes makes both the stored label and the cache check authoritative.
     * Returns null when undecodable.
     */
    private decodeSpecVersion(metadataHex: HexString): number | null {
      if (this.specVersionCache?.metadata === metadataHex) {
        return this.specVersionCache.specVersion;
      }

      let specVersion: number | null = null;
      try {
        specVersion = readSpecVersion(toRuntimeMetadataHex(metadataHex));
      } catch {
        specVersion = null;
      }

      this.specVersionCache = { metadata: metadataHex, specVersion };

      return specVersion;
    }

    private updateMetadata(metadata: ProviderMetadata) {
      const specVersion = this.decodeSpecVersion(metadata.metadata);
      const normalized: ProviderMetadata = { ...metadata, runtimeVersion: specVersion ?? metadata.runtimeVersion };

      this.metadata = normalized;
      this.events.emit('metadataReceived', normalized);
    }

    onMetadataReceived(callback: (value: ProviderMetadata) => unknown): VoidFunction {
      this.events.on('metadataReceived', callback);

      return () => this.events.off('metadataReceived', callback);
    }

    private isCacheFresh(liveSpecVersion: number, metadataVersion: number): boolean {
      if (!this.metadata || this.metadata.metadataVersion !== metadataVersion) return false;

      return this.decodeSpecVersion(this.metadata.metadata) === liveSpecVersion;
    }

    stateCall(method: string, ...args: unknown[]) {
      return super.send(STATE_CALL_METHOD, [method, ...args]);
    }

    getRuntimeVersion() {
      return super.send('state_getRuntimeVersion', []);
    }

    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      const hasParams = params.length > 0;

      if (method === STATE_METADATA_METHOD && !hasParams) {
        const runtimeVersion = await this.getRuntimeVersion();
        if (this.isCacheFresh(runtimeVersion.specVersion, LEGACY_METADATA_VERSION)) {
          return Promise.resolve(this.metadata!.metadata);
        }

        const metadata = await super.send(method, params, ...args);

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
          const runtimeVersion = await this.getRuntimeVersion();
          if (this.isCacheFresh(runtimeVersion.specVersion, metadataVersion)) {
            return Promise.resolve(this.metadata!.metadata);
          }

          const metadata = await super.send(method, params, ...args);

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
