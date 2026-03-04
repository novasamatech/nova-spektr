import { type ChainId, type HexString, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

export type MessageSigningPayload = {
  message: Uint8Array;
  signatory: AnyAccount;
  chainId?: ChainId;
};

export type MessageSigningProps = {
  signerWallet?: Wallet;
  payload: MessageSigningPayload;
  onGoBack: () => void;
  onResult: (signature: HexString) => void;
};

export type MessageSignatureResult = {
  signature: HexString;
  accountId: AccountId;
};
