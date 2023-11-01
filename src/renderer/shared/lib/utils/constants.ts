export const ZERO_BALANCE = '0';

export const DEFAULT_TRANSITION = 300;

export const PUBLIC_KEY_LENGTH = 64;

export const PUBLIC_KEY_LENGTH_BYTES = 32;

export const ADDRESS_ALLOWED_ENCODED_LENGTHS = [35, 36, 37, 38];

export const DEFAULT_QR_LIFETIME = 64;

export const SS58_DEFAULT_PREFIX = 42;

export const TEST_ACCOUNT_ID = '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014';
export const TEST_ADDRESS = '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ';
export const TEST_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const TEST_HASH = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const TEST_CHAIN_ICON =
  'https://raw.githubusercontent.com/nova-wallet/nova-spektr-utils/main/icons/v1/assets/white/Polkadot_(DOT).svg';

export const enum KeyboardKey {
  ENTER = 'Enter',
}

export const RootExplorers = [
  { name: 'Subscan', account: 'https://subscan.io/account/{address}' },
  { name: 'Sub.ID', account: 'https://sub.id/{address}' },
];
