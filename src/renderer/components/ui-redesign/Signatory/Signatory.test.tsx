import { render, screen } from '@testing-library/react';

import Signatory from '@renderer/components/ui-redesign/Signatory/Signatory';

describe('ui/Signatory', () => {
  test('should render component', () => {
    const name = 'John Doe';
    render(<Signatory address="5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX" name={name} />);

    const nameElement = screen.getByText(name);

    expect(nameElement).toBeInTheDocument();
  });
});
