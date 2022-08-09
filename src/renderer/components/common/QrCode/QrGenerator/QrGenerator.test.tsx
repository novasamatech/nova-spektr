import { render, screen } from '@testing-library/react';

import QrGenerator from './QrGenerator';

describe('QrGenerator', () => {
  test('should render component', () => {
    render(<QrGenerator value="123" />);

    const text = screen.getByText('QrGenerator - 123');
    expect(text).toBeInTheDocument();
  });
});
