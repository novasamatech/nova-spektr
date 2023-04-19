import { ChainID } from '@renderer/domain/shared-kernel';

const METADATA_PORTAL_URL = 'https://metadata.novasama.io/#/';
export const TROUBLESHOOTING_URL =
  'https://docs.novawallet.io/nova-wallet-wiki/help-and-support/troubleshooting#parity-signer-troubleshooting';

export const getMetadataPortalUrl = (chainId: ChainID) => `${METADATA_PORTAL_URL}${chainId}`;
