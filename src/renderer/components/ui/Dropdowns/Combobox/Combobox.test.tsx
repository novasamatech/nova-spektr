import { render, screen } from '@testing-library/react';

import Combobox from './Combobox';

describe('ui/Combobox/Combobox', () => {
  const options = [
    { id: '0', element: 'label_0', value: '0' },
    { id: '1', element: 'label_1', value: '1' },
  ];
  const defaultProps = {
    activeId: undefined,
    placeholder: 'Select option',
    onChange: () => {},
    options,
  };

  test('should render component', () => {
    render(<Combobox {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });
});
