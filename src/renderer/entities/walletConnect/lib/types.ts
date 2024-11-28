import type Provider from '@walletconnect/universal-provider';

export type InitConnectParams = {
  provider: Provider;
  chains: string[];
  pairing?: any;
};

export type InitReconnectParams = {
  chains: string[];
  pairing: any;
};
