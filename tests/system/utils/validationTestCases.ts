export const validationConstants = {
  feesValidation: {
    chainName: 'Polkadot Relay',
    xcmChainName: 'Polkadot Asset Hub',
    assetId: 0,
    walletName: 'Nova_fees_test',
    validationAmount: '100',
  },
  amountValidation: {
    chainName: 'Novasama Testnet - Governance',
    assetId: 0,
    validationAmount: '1000',
    amount: '1',
    amount_account_name: 'Nova Autotest-1',
    recipient: '5GeKfAFPcajhNdkP7Yyd43bvX7SP3yCjr67Cu2z72EvnxV6T',
  },
  missingAccountValidation: {
    multisigName: 'Msig_missing_account_test',
    chainName: 'Novasama Testnet - Governance',
    assetId: 0,
  },
  permissionsValidation: {
    any_proxy_name: 'Any by Autotest-1',
    non_transfer_proxy_name: 'NonTransfer by Autotest-1',
    chainName: 'Novasama Testnet - Governance',
    assetId: 0,
    amount: '1',
    validationAmount: '1000',
    recipient: '5GeKfAFPcajhNdkP7Yyd43bvX7SP3yCjr67Cu2z72EvnxV6T',
  },
  proxyDepositValidation: {
    walletName: 'Proxy_deposit_test',
    chainName: 'Polkadot Relay',
    proxyWalletAddress: 'Nova Autotest-1',
  },
  multisigDepositValidation: {
    msigName: 'Msig_deposit_test',
    chainName: 'Novasama Testnet - Governance',
    assetId: 0,
  },
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
  multisigDeposit = 'multisig deposit error',
  proxyDeposit = 'proxy deposit error',
}
