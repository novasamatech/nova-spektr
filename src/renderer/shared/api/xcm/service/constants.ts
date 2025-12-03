import { type ChainId } from '@/shared/core';

export type XcmDestinationBlacklistEntry = {
  sourceChainId?: ChainId | null;
  destinationChainId?: ChainId | null;
};

export type XcmDestinationWhitelistEntry = {
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  sourceAsset?: string;
  destinationAsset?: string;
};

export const XCM_DESTINATION_BLACKLIST: XcmDestinationBlacklistEntry[] = [
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xaa3876c1dc8a1afcc2e9a685a49ff7704cfd36ad8c90bf2702b9d1b00cc40011',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xcceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  },
  {
    destinationChainId: '0xcdedc8eadbfa209d3f207bba541e57c3c58a667b05a2e1d1e86353c9000758da',
  },
  {
    destinationChainId: '0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72',
  },
  {
    destinationChainId: '0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86',
  },
  {
    destinationChainId: '0x1bb969d85965e4bb5a651abbedf21a54b6b31a21f66b5401cc3f1e286268d736',
  },
  {
    destinationChainId: '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21',
  },
];

export const XCM_DESTINATION_WHITELIST: XcmDestinationWhitelistEntry[] = [
  {
    sourceChainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    destinationChainId: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    sourceAsset: 'ACA',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
    sourceAsset: 'KSM',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    destinationChainId: '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    sourceAsset: 'KSM',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    sourceAsset: 'DOT',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    sourceAsset: 'DOT',
    destinationAsset: 'USDT-Statemint',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9',
    destinationAsset: 'MYTH',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM-Statemine',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    destinationChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    sourceAsset: 'KSM-Statemine',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    destinationChainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
    sourceAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    destinationChainId: '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    sourceAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM-Statemine',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    destinationChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    sourceAsset: 'KSM-Statemine',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    destinationChainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
    sourceAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    destinationChainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
    destinationAsset: 'MOVR',
  },
  {
    sourceChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    destinationChainId: '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    sourceAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    destinationChainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    sourceAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    destinationChainId: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'USDT-Statemint',
  },
  {
    sourceChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    destinationChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    destinationChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationAsset: 'GLMR',
  },
  {
    sourceChainId: '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5',
    destinationChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    destinationChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    destinationChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
    destinationChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    sourceAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'ASTR',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    sourceAsset: 'DOT-Statemint',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationAsset: 'GLMR',
  },
  {
    sourceChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    destinationChainId: '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9',
    destinationAsset: 'MYTH',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM-Statemine',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    destinationChainId: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationChainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    sourceAsset: 'GLMR',
  },
  {
    sourceChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationChainId: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    sourceAsset: 'GLMR',
  },
  {
    sourceChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    sourceAsset: 'GLMR',
  },
  {
    sourceChainId: '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    destinationChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    sourceAsset: 'GLMR',
  },
  {
    sourceChainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
    destinationChainId: '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    sourceAsset: 'MOVR',
  },
  {
    sourceChainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
    destinationChainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
    sourceAsset: 'MOVR',
  },
  {
    sourceChainId: '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
    destinationChainId: '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    sourceAsset: 'MOVR',
  },
  {
    sourceChainId: '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9',
    destinationChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    sourceAsset: 'MYTH',
  },
  {
    sourceChainId: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
    destinationChainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
    destinationChainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    sourceAsset: 'KSM',
    destinationAsset: 'KSM',
  },
  {
    sourceChainId: '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
    destinationChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT-Statemint',
  },
  {
    sourceChainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    destinationChainId: '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
    sourceAsset: 'DOT',
    destinationAsset: 'DOT',
  },
];
