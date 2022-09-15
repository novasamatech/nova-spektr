import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useConnectionStorage } from '@renderer/services/storage/connectionStorage';

describe('service/storage/connectionStorage', () => {
  const setupDbMock = jest.fn((methodsToMock: any = {}) => {
    return methodsToMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return data storage access methods', () => {
    const methods = useConnectionStorage(setupDbMock());

    expect(methods.addConnection).toBeDefined();
    expect(methods.addConnections).toBeDefined();
    expect(methods.changeConnectionType).toBeDefined();
    expect(methods.getConnection).toBeDefined();
    expect(methods.getConnections).toBeDefined();
  });

  test('should get connection', async () => {
    const mockValue = 'my_value';
    const mock = setupDbMock({
      get: jest.fn().mockReturnValue(mockValue),
    });

    const { getConnection } = useConnectionStorage(mock);
    const connection = await getConnection('0x123');

    expect(connection).toEqual(mockValue);
  });

  test('should get connections', async () => {
    const mockValue = ['my_value'];
    const mock = setupDbMock({
      toArray: jest.fn().mockReturnValue(mockValue),
    });

    const { getConnections } = useConnectionStorage(mock);
    const connections = await getConnections();

    expect(connections).toEqual(mockValue);
  });

  test('should add connection', async () => {
    const mockValue: any[] = [];
    const mock = setupDbMock({
      add: jest.fn().mockImplementation((value: any) => {
        mockValue.push(value);
      }),
    });

    const { addConnection } = useConnectionStorage(mock);
    await addConnection({
      chainId: '0x123',
      connectionType: ConnectionType.RPC_NODE,
      connectionStatus: ConnectionStatus.NONE,
    });

    expect(mockValue).toHaveLength(1);
  });

  test('should add connections', async () => {
    const mockValue: any[] = [];
    const mock = setupDbMock({
      bulkAdd: jest.fn().mockImplementation((value: any[]) => {
        mockValue.push(...value);
      }),
    });

    const { addConnections } = useConnectionStorage(mock);
    await addConnections([
      {
        chainId: '0x123',
        connectionType: ConnectionType.RPC_NODE,
        connectionStatus: ConnectionStatus.NONE,
      },
      {
        chainId: '0x234',
        connectionType: ConnectionType.DISABLED,
        connectionStatus: ConnectionStatus.NONE,
      },
    ]);

    expect(mockValue).toHaveLength(2);
  });

  test('should change connection type', async () => {
    const mockValue = {
      chainId: '0x123' as ChainId,
      connectionType: ConnectionType.DISABLED,
      connectionStatus: ConnectionStatus.NONE,
    };
    const mock = setupDbMock({
      update: jest.fn().mockImplementation((_: any, { connectionType }: any) => {
        mockValue.connectionType = connectionType;
      }),
    });

    expect(mockValue.connectionType).toEqual(ConnectionType.DISABLED);

    const { changeConnectionType } = useConnectionStorage(mock);
    await changeConnectionType(mockValue, ConnectionType.RPC_NODE);

    expect(mockValue.connectionType).toEqual(ConnectionType.RPC_NODE);
  });
});
