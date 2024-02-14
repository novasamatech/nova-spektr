import { act, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import { ButtonWebLink } from './ButtonWebLink';

describe('ui/Buttons/ButtonWebLink', () => {
  test('should render component', () => {
    render(<ButtonWebLink href="test_page" />, { wrapper: MemoryRouter });

    const buttonLink = screen.getByRole('link');
    expect(buttonLink).toBeInTheDocument();
  });

  test('should navigate on click', () => {
    window.history.pushState({}, '', '/init_page');

    render(<ButtonWebLink href="test_page" />, { wrapper: BrowserRouter });

    expect(window.location.href).toEqual('http://localhost/init_page');

    const buttonLink = screen.getByRole('link');
    act(() => buttonLink.click());

    expect(window.location.href).toEqual('http://localhost/test_page');
  });

  test('should render disabled', () => {
    render(
      <ButtonWebLink href="test_page" disabled>
        Disabled
      </ButtonWebLink>,
      { wrapper: MemoryRouter },
    );

    const buttonLink = screen.queryByRole('link');
    expect(buttonLink).not.toBeInTheDocument();

    const disabledContainer = screen.getByText('Disabled');
    expect(disabledContainer).toBeInTheDocument();
  });
});
