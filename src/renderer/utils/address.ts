import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { PublicKey } from '@renderer/domain/shared-kernel';
import { SS58_DEFAULT_PREFIX } from '@renderer/services/balance/common/constants';

export const formatAddress = (address: string, prefix = SS58_DEFAULT_PREFIX): string => {
  if (!address) return '';

  return encodeAddress(decodeAddress(address), prefix) || address;
};

export const toPublicKey = (address: string): PublicKey | undefined => {
  if (!address) return;

  return u8aToHex(decodeAddress(address));
};
