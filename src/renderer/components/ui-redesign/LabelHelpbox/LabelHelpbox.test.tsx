import { render, screen } from '@testing-library/react';

import { LabelHelpbox } from './LabelHelpbox';

describe('ui/LabelHelpbox', () => {
  test('should render component', () => {
    const label = 'This is simple content';
    render(<LabelHelpbox label={label} />);

    const children = screen.getByText(label);
    expect(children).toBeInTheDocument();
  });
});
