import { SigningType } from '@renderer/domain/shared-kernel';

export const DEFAULT_TRANSITION = 200;

export const PUBLIC_KEY_LENGTH = 64;

export const DEFAULT_QR_LIFETIME = 64;

export const SS58_DEFAULT_PREFIX = 42;

export const TEST_ACCOUNT_ID = '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014';
export const TEST_ADDRESS = '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ';
export const TEST_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export const SigningBadges = {
  [SigningType.PARITY_SIGNER]: 'paritySignerBg',
  [SigningType.MULTISIG]: 'multisigBg',
  [SigningType.WATCH_ONLY]: 'watchOnlyBg',
} as const;

export const enum KeyboardKey {
  ENTER = 'Enter',
}
