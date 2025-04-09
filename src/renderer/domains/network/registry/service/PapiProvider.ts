import { type JsonRpcProvider } from 'polkadot-api/ws-provider/web';

import { createUniversalProvider } from '@/shared/api/network';

export function createPapiProvider(): JsonRpcProvider {
  const provider = createUniversalProvider();

  // TODO: should connect somewhere here

  const send = (message: string) => {
    console.log(`MSG OUT: ${message}`);
    provider.send(message);
  };

  const disconnect = () => {
    console.log(`DISCONNECTED`);
    provider.disconnect();
  };

  return onMessage => {
    console.log('MSG IN: ', onMessage);

    return { send, disconnect };
  };
}
