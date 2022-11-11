import { ChainId } from '@renderer/domain/shared-kernel';

const METADATA_PORTAL_URL = 'https://nova-wallet.github.io/metadata-portal/#/';
export const TROUBLESHOOTING_URL = 'https://github.com/nova-wallet/nova-utils/wiki/Parity-Signer-troubleshooting';

export const getMetadataPortalUrl = (chainId: ChainId) => `${METADATA_PORTAL_URL}${chainId}`;
