import { isEthereumAccountId, toAddress } from '@shared/lib/utils';
import { AccountType, Chain, ChainOptions, ChainType, CryptoType, SigningType, WalletType } from '@shared/core';

export const multisigUtils = {
  isMultisigSupported,
  buildMultisig,
};

function isMultisigSupported(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.MULTISIG));
}

type BuildMultisigParams = {
  threshold: number;
  accountId: `0x${string}`;
  signatories: string[];
  chain: Chain;
};

function buildMultisig({ threshold, accountId, signatories, chain }: BuildMultisigParams) {
  return {
    wallet: {
      name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
      type: WalletType.MULTISIG,
      signingType: SigningType.MULTISIG,
    },
    accounts: [
      {
        threshold: threshold,
        accountId: accountId,
        signatories: signatories.map((signatory) => ({
          accountId: signatory,
          address: toAddress(signatory),
        })),
        name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
        chainId: chain.chainId,
        cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.MULTISIG,
      },
    ],
  };
}
