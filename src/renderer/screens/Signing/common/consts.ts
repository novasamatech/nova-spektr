import { ChainId } from '@renderer/domain/shared-kernel';

const METADATA_PORTAL_URL = 'https://nova-wallet.github.io/metadata-portal/#/';
export const TROUBLESHOOTING_URL =
  'https://docs.novawallet.io/nova-wallet-wiki/help-and-support/troubleshooting#parity-signer-troubleshooting';

export const getMetadataPortalUrl = (chainId: ChainId) => `${METADATA_PORTAL_URL}${chainId}`;
