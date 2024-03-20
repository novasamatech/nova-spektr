import { fork, allSettled } from 'effector';

import { editCustomRpcModel } from '../edit-custom-rpc-model';
import { ConnectionStatus, RpcNode } from '@shared/core';
import { ExtendedChain } from '@entities/network';
import { RpcCheckResult } from '../../lib/types';

describe('features/network/CustomRpcForm/edit-custom-rpc-model', () => {
  test('should have the form pre-filled on launch', async () => {
    const scope = fork();
    const mockNode = { name: 'some name', url: 'some url' } as RpcNode;

    await allSettled(editCustomRpcModel.events.nodeSelected, { scope, params: mockNode });

    expect(scope.getState(editCustomRpcModel.$editCustomRpcForm.$values)).toEqual(mockNode);
  });

  test('should have error for wrong node url', async () => {
    const scope = fork();

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'some name' });
    await allSettled(url.onChange, { scope, params: 'wrong url' });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.validate, { scope });

    expect(scope.getState(name.$errors)).toEqual([]);
    expect(scope.getState(url.$errors)[0].rule).toEqual('wsAddressValidation');
  });

  test('should have error for no node url', async () => {
    const scope = fork();

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'some name' });
    await allSettled(url.onChange, { scope, params: '' });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.validate, { scope });

    expect(scope.getState(name.$errors)).toEqual([]);
    expect(scope.getState(url.$errors)[0].rule).toEqual('required');
  });

  test('should have errors for long name', async () => {
    const scope = fork();

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'some long name that is more than 50 characters long limit' });
    await allSettled(url.onChange, { scope, params: 'wss://some-rpc.com' });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.validate, { scope });

    expect(scope.getState(url.$errors)).toEqual([]);
    expect(scope.getState(name.$errors)[0].rule).toEqual('minMaxLength');
  });

  test('should have errors for short name', async () => {
    const scope = fork();

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'ab' });
    await allSettled(url.onChange, { scope, params: 'wss://some-rpc.com' });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.validate, { scope });

    expect(scope.getState(url.$errors)).toEqual([]);
    expect(scope.getState(name.$errors)[0].rule).toEqual('minMaxLength');
  });

  test('should not have the node already existing', async () => {
    const scope = fork();

    const network = {
      chainId: '0x01',
      connection: { chainId: '0x01', id: '0x01' },
      connectionStatus: ConnectionStatus.CONNECTED,
      nodes: [{ url: 'wss://some-rpc.com', name: 'node' }],
    };

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'some name' });
    await allSettled(url.onChange, { scope, params: 'wss://some-rpc.com' });
    await allSettled(editCustomRpcModel.events.networkChanged, { scope, params: network as unknown as ExtendedChain });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.submit, { scope });

    expect(scope.getState(editCustomRpcModel.$editCustomRpcForm.$isValid)).toEqual(true);
  });

  test('should have the wrong network state', async () => {
    const scope = fork();

    const network = {
      specName: 'polkadot',
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      connection: {
        chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        id: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      },
      connectionStatus: ConnectionStatus.CONNECTED,
      nodes: [{ url: 'wss://some-rpc.com', name: 'node' }],
    };

    expect(scope.getState(editCustomRpcModel.$rpcConnectivityResult)).toEqual(RpcCheckResult.INIT);

    const { name, url } = editCustomRpcModel.$editCustomRpcForm.fields;
    await allSettled(name.onChange, { scope, params: 'some name' });
    // this is a kusama node
    await allSettled(url.onChange, { scope, params: 'wss://rockx-ksm.w3node.com/polka-public-ksm/ws' });
    await allSettled(editCustomRpcModel.events.networkChanged, { scope, params: network as unknown as ExtendedChain });
    await allSettled(editCustomRpcModel.$editCustomRpcForm.submit, { scope });

    expect(scope.getState(editCustomRpcModel.$rpcConnectivityResult)).toEqual(RpcCheckResult.LOADING);
  });
});