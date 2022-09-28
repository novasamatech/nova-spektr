import { act, render, screen } from '@testing-library/react';

import useToggle from '@renderer/hooks/useToggle';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import ConnectionSelector from './Selector';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connectToNetwork: jest.fn(),
  })),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/hooks/useToggle');

jest.mock('../CustomRpc/CustomRpc', () => () => 'customRpc');

describe('screen/Settings/Networks/ConnectionSelector/Selector', () => {
  const defaultNetwork: ExtendedChain = {
    addressPrefix: 0,
    assets: [],
    chainId: '0x123',
    icon: '',
    name: '',
    nodes: [
      { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
      { url: 'wss://westend.api.onfinality.io/public-ws', name: 'OnFinality node' },
    ],
    connection: {
      chainId: '0x123',
      connectionStatus: ConnectionStatus.NONE,
      connectionType: ConnectionType.DISABLED,
    },
  };

  beforeEach(() => {
    (useToggle as jest.Mock).mockReturnValue([false, () => {}]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const text = screen.getByText('networkManagement.selectConnection.selectConnectionLabel');
    expect(text).toBeInTheDocument();
  });

  test('should render list of nodes', async () => {
    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const nodes = screen.getAllByRole('radio');
    expect(nodes).toHaveLength(3);
  });

  test('should render open custom rpc component', async () => {
    const spyToggle = jest.fn();
    (useToggle as jest.Mock).mockReturnValue([false, spyToggle]);

    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const addRpcBtn = screen.getByRole('button', { name: /networkManagement.addCustomNodeButton/ });
    await act(async () => addRpcBtn.click());

    expect(spyToggle).toBeCalled();
  });
});
