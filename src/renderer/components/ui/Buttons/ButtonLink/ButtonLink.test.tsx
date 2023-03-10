import { act, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import ButtonLink from './ButtonLink';

describe('ui/Buttons/ButtonLink', () => {
  test('should render component', () => {
    render(<ButtonLink to="test_page" pallet="primary" variant="outline" />, { wrapper: MemoryRouter });

    const buttonLink = screen.getByRole('link');
    expect(buttonLink).toBeInTheDocument();
  });

  test('should navigate on click', () => {
    window.history.pushState({}, '', '/init_page');

    render(
      <BrowserRouter>
        <ButtonLink to="test_page" pallet="primary" variant="outline" />
      </BrowserRouter>,
    );

    expect(window.location.href).toEqual('http://localhost/init_page');

    const buttonLink = screen.getByRole('link');
    act(() => buttonLink.click());

    expect(window.location.href).toEqual('http://localhost/test_page');
  });

  test('should render disabled', () => {
    render(
      <ButtonLink to="test_page" disabled pallet="primary" variant="outline">
        Disabled
      </ButtonLink>,
      { wrapper: MemoryRouter },
    );

    const buttonLink = screen.queryByRole('link');
    expect(buttonLink).not.toBeInTheDocument();

    const disabledContainer = screen.getByText('Disabled');
    expect(disabledContainer).toBeInTheDocument();
  });
});
