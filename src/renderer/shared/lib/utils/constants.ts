import { BN, BN_THOUSAND, BN_TWO } from '@polkadot/util';

import { type Address, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const ZERO_BALANCE = '0';

export const DEFAULT_TRANSITION = 300;

export const PUBLIC_KEY_LENGTH = 64;

export const PUBLIC_KEY_LENGTH_BYTES = 32;
export const ETHEREUM_PUBLIC_KEY_LENGTH_BYTES = 20;

export const ADDRESS_ALLOWED_ENCODED_LENGTHS = [35, 36, 37, 38];

export const SS58_DEFAULT_PREFIX = 0;
export const SS58_PUBLIC_KEY_PREFIX = 1;

export const TEST_ACCOUNTS: [AccountId, AccountId, AccountId, AccountId] = [
  '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014' as AccountId,
  '0x83e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c765' as AccountId,
  '0x3b8318a62a8f84e86ef55432ef5c029be966b840a1f070175d8a92df6e08e99b' as AccountId,
  '0x6871a0a8984a068b69e853a0a9b221dc7876d141547fea7c1cf6457c55fba20b' as AccountId,
];

export const TEST_ADDRESS = '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ' as Address;
export const TEST_EVM_ADDRESS = '0xaE55781508185aEF188D34c69C0eb03B51a1aD0b' as Address;
export const TEST_SUBSTRATE_ADDRESS = '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9' as Address;

export const TEST_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const TEST_HASH = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
export const TEST_CHAIN_ICON =
  'https://raw.githubusercontent.com/nova-wallet/nova-spektr-utils/main/icons/v1/assets/white/Polkadot_(DOT).svg';

export const enum KeyboardKey {
  SPACE = 'Space',
  ENTER = 'Enter',
}

export const RootExplorers = [
  { name: 'Subscan', account: 'https://subscan.io/account/{address}' },
  { name: 'Sub.ID', account: 'https://sub.id/{address}' },
];

export const RelayChains = {
  POLKADOT: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  KUSAMA: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  WESTEND: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  ROCOCO: '0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e',
} as const satisfies Record<string, ChainId>;

/**
 * Marker used in the keys export/import file in place of a genesis hash, for
 * keys the user did not scope to a network.
 */
export const UNIVERSAL_GENESIS = 'universal';

// Some chains incorrectly use these, i.e. it is set to values such as 0 or even 2
// Use a low minimum validity threshold to check these against
export const THRESHOLD = BN_THOUSAND.div(BN_TWO);
export const DEFAULT_TIME = new BN(6_000);
export const ONE_DAY = new BN(24 * 60 * 60 * 1000);

export const MONTH = 30 * 24 * 60 * 60 * 1000;

export const MORTALITY_PERIOD_MS = 5 * 60 * 1000;

const CHAINS_CONFIG_VERSION = 'v2';
const TOKENS_CONFIG_VERSION = 'v1';
export const CHAINS_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/chains/${CHAINS_CONFIG_VERSION}/${process.env.CHAINS_FILE + '.json'}`;
export const TOKENS_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/tokens/${TOKENS_CONFIG_VERSION}/${process.env.TOKENS_FILE + '.json'}`;

// We need to map the chain id to the SpellSDK's chain name for the xcm transfers while using the ParaSpell SDK
export const CHAIN_ID_TO_SPELL_NAME_MAP: Record<ChainId, string> = {
  '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': 'Polkadot',
  '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': 'Kusama',
  '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': 'Westend',
  '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f': 'AssetHubPolkadot',
  '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a': 'AssetHubKusama',
  '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008': 'PeoplePolkadot',
  '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f': 'PeopleKusama',
  '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b': 'Karura',
  '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d': 'Moonbeam',
  '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b': 'Moonriver',
  '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108': 'Shiden',
  '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed': 'BifrostKusama',
  '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755': 'Basilisk',
  '0xaa3876c1dc8a1afcc2e9a685a49ff7704cfd36ad8c90bf2702b9d1b00cc40011': 'Altair',
  '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21': 'KiltSpiritnet',
  '0xcd4d732201ebe5d6b014edda071c4203e16867305332301dc8d092044b28e554': 'Quartz',
  '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c': 'Acala',
  '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6': 'Astar',
  '0x631ccc82a078481584041656af292834e1ae6daab61d2875b4dd0c14bb9b17bc': 'RobonomicsPolkadot',
  '0x9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b': 'Kintsugi',
  '0x1bf2a2ecb4a868de66ea8610f2ce7c8c43706561b6476031315f6640fe38e060': 'Zeitgeist',
  '0xcdedc8eadbfa209d3f207bba541e57c3c58a667b05a2e1d1e86353c9000758da': 'IntegriteePolkadot',
  '0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82': 'Centrifuge',
  '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d': 'Hydration',
  '0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72': 'Interlay',
  '0x1bb969d85965e4bb5a651abbedf21a54b6b31a21f66b5401cc3f1e286268d736': 'Phala',
  '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b': 'BifrostPolkadot',
  '0x2fc8bb6ed7c0051bdcf4866c322ed32b6276572713607e3297ccf411b8f14aa9': 'Heima',
  '0xcceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf': 'Amplitude',
  '0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86': 'Pendulum',
  '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464': 'BridgeHubPolkadot',
  '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5': 'BridgeHubKusama',
  '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2': 'Collectives',
  '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9': 'Mythos',
  '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4': 'CoretimePolkadot',
  '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050': 'CoretimeKusama',
};
