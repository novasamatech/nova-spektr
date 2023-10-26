import Client from '@walletconnect/sign-client';

export type InitConnectParams = {
  client: Client;
  chains: string[];
  pairing?: any;
};
