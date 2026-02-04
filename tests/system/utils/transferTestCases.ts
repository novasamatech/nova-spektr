export const transferTestCases = [
  {
    chainName: 'Kusama Asset Hub',
    assetId: 0,
    amount: '0.001',
    recipient: 'FLVFEaY1oa7tAqfqh6gCb1q9RGuFHS1pkvAsAF7wwWUTFxY',
  },
  {
    chainName: 'Polkadot Asset Hub',
    assetId: 0,
    amount: '0.01',
    recipient: '13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq',
  },
  {
    chainName: 'Hydration',
    assetId: 0,
    amount: '0.01',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
];

export const proxyTransferTestCase = [
  {
    chainName: 'Polkadot Asset Hub',
    assetId: 0,
    amount: '0.01',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
];

export const xcmTransferTestCases = [
  {
    chainName: 'Polkadot Asset Hub',
    assetId: 0,
    xcmChainName: 'Hydration',
    amount: '0.01',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
];

export const transferConstants = {
  multisig_name: 'multisig_transfer',
  nova_name: 'nova_transfer',
  proxy_name: 'proxy_transfer',
  vault_name: 'vault_transfer',
  watch_only_name: 'watch_only_transfer',
  watch_only_chain: 'Polkadot Asset Hub',
  watch_only_asset_id: 0,
};
