import type Client from '@walletconnect/sign-client';
import { type PairingTypes } from '@walletconnect/types';

export type InitConnectParams = {
  provider: Client;
  chains: string[];
  pairing?: Pick<PairingTypes.Struct, 'topic'>;
};

export type InitReconnectParams = {
  chains: string[];
  pairing: any;
};
