import { WalletType } from '../../../domain/shared-kernel';

export type Wallet = {
  name: string;
  type: WalletType;
};

export function createWallet({ name, type }: Wallet): Wallet {
  return {
    name,
    type,
  } as Wallet;
}
