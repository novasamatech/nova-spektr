import { screen, render } from '@testing-library/react';

import { GraphqlProvider } from './GraphqlContext';

jest.mock('@renderer/hooks/useToggle');

describe('context/GraphqlProvider', () => {
  test('should render children', () => {
    render(<GraphqlProvider>children</GraphqlProvider>);

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});
