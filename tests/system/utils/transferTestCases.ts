export const transferTestCases = [
  {
    chainName: 'Polkadot Relay',
    assetId: 0,
    amount: '0.1',
    validationAmount: '1000',
    recipient: '13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq',
  },
  {
    chainName: 'Kusama Asset Hub',
    assetId: 0,
    amount: '0.01',
    validationAmount: '1000',
    recipient: 'FLVFEaY1oa7tAqfqh6gCb1q9RGuFHS1pkvAsAF7wwWUTFxY',
  },
  {
    chainName: 'Polkadot Asset Hub',
    assetId: 0,
    amount: '0.01',
    validationAmount: '1000',
    recipient: '13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq',
  },
  {
    chainName: 'Hydration',
    assetId: 0,
    amount: '0.01',
    validationAmount: '1000',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
];

export const xcmTransferTestCases = [
  {
    chainName: 'Polkadot Relay',
    assetId: 0,
    xcmChainName: 'Polkadot Asset Hub',
    amount: '1',
    validationAmount: '1000',
    recipient: '14tqRfiFfYeB12o7d9YK4X9LiCMKLNCt1LoVdWZypWbwNp2Y',
  },
  {
    chainName: 'Polkadot Relay',
    assetId: 0,
    xcmChainName: 'Hydration',
    amount: '0.01',
    validationAmount: '1000',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
  {
    chainName: 'Hydration',
    assetId: 1,
    xcmChainName: 'Moonbeam',
    amount: '0.01',
    validationAmount: '1000',
    recipient: '0xcdc1e6538f09d8a52059f41a7f580bde6a35e994',
  },
  {
    chainName: 'Karura',
    assetId: 2,
    xcmChainName: 'Moonriver',
    amount: '0.01',
    validationAmount: '1000',
    recipient: '0xcdc1e6538f09d8a52059f41a7f580bde6a35e994',
  },
];

export const proxyTransferTestCases = [
  {
    chainName: 'Novasama Testnet - Governance',
    amount: '0.1',
    validationAmount: '1000',
    recipient: '5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP',
  },
];

export const transferConstants = {
  multisigName: 'autotest_msig',
  proxyName: 'Nova_autotest proxy',
  amount: '0.1',
  validationAmount: '1000',
  recipient: '5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP',
};
