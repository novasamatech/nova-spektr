import { ChainId, CryptoType, PublicKey, AccountID } from './shared-kernel';

export type Account = {
  accountId: AccountID;
  publicKey: PublicKey;
  cryptoType: CryptoType;
};

export type ChainAccount = Account & {
  chainId: ChainId;
};
