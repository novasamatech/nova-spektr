import { act, render, renderHook, screen } from '@testing-library/react';

import { GraphqlProvider, useGraphql } from './GraphqlContext';

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
