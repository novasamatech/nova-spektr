import { act, render, renderHook, screen } from '@testing-library/react';

import { GraphqlProvider, useGraphql } from './GraphqlContext';

jest.mock('@renderer/shared/hooks/useToggle');

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getStakingChainsData: jest
      .fn()
      .mockResolvedValue([
        { chainId: '0x123', externalApi: { staking: [{ type: 'subquery', url: 'https://localhost:8080' }] } },
      ]),
  }),
}));

jest.mock('@renderer/services/settings/settingsStorage', () => ({
  useSettingsStorage: jest.fn().mockReturnValue({
    getStakingNetwork: jest.fn().mockReturnValue('0x123'),
  }),
}));

describe('context/GraphqlProvider', () => {
  test('should render children', async () => {
    await act(async () => {
      render(<GraphqlProvider>children</GraphqlProvider>);
    });

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });

  test('should provider changeClient through hook', async () => {
    let result: any;
    await act(async () => {
      result = renderHook(() => useGraphql(), { wrapper: GraphqlProvider });
    });

    expect(result.result.current.changeClient).toBeDefined();
  });
});
