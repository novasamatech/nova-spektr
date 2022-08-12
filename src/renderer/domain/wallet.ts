import { Contact } from './contact';
import { Account, ChainAccount } from './account';

export type SimpleWallet = {
  name: string;
  mainAccounts: Account[];
  chainAccounts: ChainAccount[];
  isMultisig: boolean;
  type: WalletType;
};

export type MultisigWallet = {
  name: string;
  mainAccounts: Account[];
  chainAccounts: ChainAccount[];
  isMultisig: boolean;
  type: WalletType;
  threshold?: number;
  originContacts?: Contact[];
  messengerRoomId?: string;
};

export type Wallet = SimpleWallet | MultisigWallet;

export const enum WalletType {
  WATCH_ONLY,
  PARITY,
  LEDGER,
}

export function isMultisig(wallet?: Wallet): boolean {
  return Boolean(wallet?.isMultisig);
}

export function createSimpleWallet<T extends SimpleWallet>({
  name,
  type,
  mainAccounts,
  chainAccounts,
  isMultisig,
}: T): Wallet {
  return {
    name,
    type,
    mainAccounts,
    chainAccounts,
    isMultisig,
  };
}

export function createMultisigWallet<T extends MultisigWallet>({
  name,
  type,
  mainAccounts,
  chainAccounts,
  isMultisig,
  threshold,
  originContacts,
  messengerRoomId,
}: T): Wallet {
  return {
    name,
    type,
    mainAccounts,
    chainAccounts,
    isMultisig,
    threshold,
    originContacts,
    messengerRoomId,
  };
}
