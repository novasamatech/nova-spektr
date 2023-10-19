import Client from '@walletconnect/sign-client';
import { SessionTypes } from '@walletconnect/types';

export type InitConnectProps = {
  client: Client;
  chains: string[];
  pairing?: any;
};

export type ConnectProps = {
  client: Client;
  approval: () => Promise<any>;
  onConnect?: () => void;
};

export type DisconnectProps = {
  client: Client;
  session: SessionTypes.Struct;
};
