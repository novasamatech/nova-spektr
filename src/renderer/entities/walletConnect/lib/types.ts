import type Client from '@walletconnect/sign-client';

export type InitConnectParams = {
  client: Client;
  chains: string[];
  pairing?: any;
};

export type InitReconnectParams = {
  chains: string[];
  pairing: any;
};
