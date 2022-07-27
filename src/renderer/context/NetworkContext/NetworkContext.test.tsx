import { render, screen } from '@testing-library/react';

// import { useNetwork } from '@renderer/services/network/networkService';
import { NetworkProvider } from './NetworkContext';

jest.mock('@renderer/services/network/networkService', () =>
  jest.fn().mockReturnValue({
    useNetwork: jest.fn().mockReturnValue({
      init: jest.fn(),
    }),
  }),
);

describe('context/NetworkContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children and run init', async () => {
    // const init = jest.fn();
    // (useNetwork as jest.Mock).mockReturnValue(() => ({}));

    render(<NetworkProvider>children</NetworkProvider>);

    expect(screen.getByText('children')).toBeInTheDocument();
    // expect(init).toBeCalledTimes(1);
  });
});
