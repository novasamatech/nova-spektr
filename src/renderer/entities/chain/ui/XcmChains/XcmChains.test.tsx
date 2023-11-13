import { render, screen } from '@testing-library/react';

import { XcmChains } from './XcmChains';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('../ChainTitle/ChainTitle', () => ({
  ChainTitle: ({ chainId }: any) => <span>{chainId}</span>,
}));

describe('ui/XcmChains', () => {
  test('should render component', async () => {
    render(<XcmChains chainIdFrom="0x111" chainIdTo="0x111" />);

    const chains = screen.getAllByText('0x111');
    expect(chains).toHaveLength(2);
  });

  test('should render single chain', async () => {
    render(<XcmChains chainIdFrom="0x111" />);

    const chains = screen.getByText('0x111');
    expect(chains).toBeInTheDocument();
  });
});
