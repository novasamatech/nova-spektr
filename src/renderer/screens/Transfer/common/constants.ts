import { SigningType } from '@renderer/domain/shared-kernel';

export const Icons = {
  [SigningType.PARITY_SIGNER]: 'paritySignerBg',
  [SigningType.MULTISIG]: 'multisigBg',
  [SigningType.WATCH_ONLY]: 'watchOnlyBg',
} as const;

export const Badges = {
  [SigningType.WATCH_ONLY]: 'watchOnlyBg',
  [SigningType.PARITY_SIGNER]: 'paritySignerBg',
  [SigningType.MULTISIG]: 'multisigBg',
} as const;
