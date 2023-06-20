import { render, screen } from '@testing-library/react';

import { LabelHelpBox } from './LabelHelpBox';

describe('ui/LabelHelpBox', () => {
  test('should render component', () => {
    const label = 'This is simple content';
    render(<LabelHelpBox>{label}</LabelHelpBox>);

    const children = screen.getByText(label);
    expect(children).toBeInTheDocument();
  });
});
