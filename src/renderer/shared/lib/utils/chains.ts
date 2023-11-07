import type { Address, ChainId, Explorer, HexString, AccountId } from '@renderer/shared/core';
import { SS58_DEFAULT_PREFIX } from './constants';
import { toAddress } from './address';

export const toLocalChainId = (chainId?: ChainId): string | undefined => {
  return chainId?.replace('0x', '');
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
};

/**
 * Get block explorer URL by AccountId or Address
 * @param explorer explorer with links
 * @param address value of address or accountId
 * @param addressPrefix prefix of the network
 * @return {String | undefined}
 */
export const getAccountExplorer = (
  explorer: Explorer,
  address: Address | AccountId,
  addressPrefix = SS58_DEFAULT_PREFIX,
): string | undefined => {
  return explorer.account?.replace('{address}', toAddress(address, { prefix: addressPrefix }));
};

/**
 * Get extrinsic explorer URL by hash
 * @param explorer explorer with links
 * @param hash extrinsic hash
 * @return {String | undefined}
 */
export const getExtrinsicExplorer = (explorer: Explorer, hash: HexString): string | undefined => {
  return explorer.extrinsic?.replace('{hash}', hash);
};
