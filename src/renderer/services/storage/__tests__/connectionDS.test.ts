import { ConnectionType } from '@renderer/domain/connection';
import { useConnectionStorage } from '@renderer/services/storage/connectionDS';

describe('service/storage/connectionDS', () => {
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
    await addConnection('0x123', ConnectionType.RPC_NODE);

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
      { chainId: '0x123', type: ConnectionType.RPC_NODE },
      { chainId: '0x234', type: ConnectionType.DISABLED },
    ]);

    expect(mockValue).toHaveLength(2);
  });

  test('should change connection type', async () => {
    const mockValue = { chainId: '0x234', type: ConnectionType.DISABLED };
    const mock = setupDbMock({
      update: jest.fn().mockImplementation((_: any, { type }: any) => {
        mockValue.type = type;
      }),
    });

    expect(mockValue.type).toEqual(ConnectionType.DISABLED);

    const { changeConnectionType } = useConnectionStorage(mock);
    await changeConnectionType({ chainId: '0x234', type: ConnectionType.DISABLED }, ConnectionType.RPC_NODE);

    expect(mockValue.type).toEqual(ConnectionType.RPC_NODE);
  });
});
