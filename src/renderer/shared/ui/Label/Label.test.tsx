import { render, screen } from '@testing-library/react';

import { Label } from './Label';

describe('ui/LabelHelpBox', () => {
  test('should render component', () => {
    const label = 'This is simple content';
    render(<Label>{label}</Label>);

    const children = screen.getByText(label);
    expect(children).toBeInTheDocument();
  });
});
