import { SigningType } from '@/shared/core';

export const getPolkadotVaultVersion = (signingType: SigningType) => {
  switch (signingType) {
    case SigningType.POLKADOT_VAULT:
      return '7.1';
    case SigningType.PARITY_SIGNER:
    default:
      return '7.2';
  }
};
