import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import noop from 'lodash/noop';

import { ButtonDropdown } from './ButtonDropdown';

describe('ui/Buttons/ButtonDropdown', () => {
  const Options = [
    { id: '0', title: 'label_0', onClick: noop },
    { id: '1', title: 'label_1', onClick: noop },
  ];

  const renderButton = (options: any[]) => {
    render(
      <ButtonDropdown title="button">
        {options.map(({ id, title, onClick }) => (
          <ButtonDropdown.Item key={id}>
            <button onClick={onClick}>{title}</button>
          </ButtonDropdown.Item>
        ))}
      </ButtonDropdown>,
    );
  };

  test('should render component', () => {
    render(<ButtonDropdown title="button" />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('should not render options without click', () => {
    renderButton(Options);

    const options = screen.queryByRole('listitem');
    expect(options).not.toBeInTheDocument();
  });

  test('should render options after click', async () => {
    renderButton(Options);

    await userEvent.click(screen.getByRole('button'));

    const options = screen.getAllByRole('menuitem');
    expect(options).toHaveLength(2);
  });
});
