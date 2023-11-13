import { render, screen } from '@testing-library/react';

import Switch from './Switch';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('ui/Switch', () => {
  test('should render component', () => {
    render(<Switch>test label</Switch>);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });
});
