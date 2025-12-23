import { SigningType } from '@/shared/core';

export const getPolkadotVaultVersion = ({ signingType, isBulkTx }: { signingType: SigningType; isBulkTx: boolean }) => {
  switch (signingType) {
    case SigningType.POLKADOT_VAULT:
      return '7.1';
    case SigningType.PARITY_SIGNER:
    default:
      return isBulkTx ? '7.2' : '7.0';
  }
};
