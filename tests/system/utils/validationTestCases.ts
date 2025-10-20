export const feeValidationConstants = {
  chainName: 'Polkadot Relay',
  xcmChainName: 'Polkadot Asset Hub',
  assetId: 0,
  novaWalletName: 'fee_autotest',
  validationAmount: '100',
};

export const missingAccountValidationConstants = {
  multisigName: 'autotest_msig',
  chainName: 'Novasama Testnet - Governance',
  assetId: 0,
};

export const permissionsValidationConstants = {
  account_name: 'Nova Autotest-1',
  any_proxy_name: 'Any by Autotest-1',
  non_transfer_proxy_name: 'NonTransfer by Autotest-1',
  chainName: 'Novasama Testnet - Governance',
  assetId: 0,
  amount: '1',
  validationAmount: '1000',
  recipient: '148d6UDCJ1cTN5cfPpxfwatH9wibvrK3ZGqhrEb4SmDukbkM',
};

export enum Validation {
  fatal = 'fatal error',
  permission = 'permission error',
  missingAccount = 'missing account error',
  balance = 'balance error',
  sendingAmount = 'sending amount error',
  networkFee = 'network fee error',
  xcmFee = 'xcm-fee error',
  deliveryFee = 'delivery fee error',
}
