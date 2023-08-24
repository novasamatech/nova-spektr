import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import { ButtonLink } from './ButtonLink';

describe('ui/Buttons/ButtonLink', () => {
  test('should render component', () => {
    render(<ButtonLink to="test_page" />, { wrapper: MemoryRouter });

    const buttonLink = screen.getByRole('link');
    expect(buttonLink).toBeInTheDocument();
  });

  test('should navigate on click', async () => {
    window.history.pushState({}, '', '/init_page');

    render(<ButtonLink to="test_page" />, { wrapper: BrowserRouter });

    expect(window.location.href).toEqual('http://localhost/init_page');

    await userEvent.click(screen.getByRole('link'));

    expect(window.location.href).toEqual('http://localhost/test_page');
  });

  test('should render disabled', () => {
    render(
      <ButtonLink to="test_page" disabled>
        Disabled
      </ButtonLink>,
      { wrapper: MemoryRouter },
    );

    const buttonLink = screen.queryByRole('link');
    expect(buttonLink).not.toBeInTheDocument();

    const disabledContainer = screen.getByText('Disabled');
    expect(disabledContainer).toBeInTheDocument();
  });

  test('should call callback on page transition', async () => {
    const spyCallback = jest.fn();
    render(<ButtonLink to="test_page" callback={spyCallback} />, {
      wrapper: MemoryRouter,
    });

    await userEvent.click(screen.getByRole('link'));

    expect(spyCallback).toHaveBeenCalled();
  });
});
