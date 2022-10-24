import { array, Codec, object, option, sizedUint8Array, str, taggedUnion, u8 } from 'parity-scale-codec';

import { CryptoType } from '@renderer/domain/shared-kernel';
import { SeedInfo, AddressInfo } from './types';

const MULTI_SIGNER = taggedUnion('MultiSigner', [
  ['Ed25519', ['public', sizedUint8Array(32)]],
  ['Sr25519', ['public', sizedUint8Array(32)]],
  ['Ecdsa', ['public', sizedUint8Array(33)]],
]);

const ADDRESS_INFO: Codec<AddressInfo> = object(
  ['address', str],
  ['derivationPath', option(str)],
  ['encryption', u8 as Codec<CryptoType>],
  ['genesisHash', sizedUint8Array(32)],
);

const SEED_INFO: Codec<SeedInfo> = object(
  ['name', str],
  ['multiSigner', option(MULTI_SIGNER)],
  ['derivedKeys', array(ADDRESS_INFO)],
);

// Export address format for decoding; Rust enum is a tagged union
export const EXPORT_ADDRESS = taggedUnion('ExportAddrs', [['V1', ['payload', array(SEED_INFO)]]]);
